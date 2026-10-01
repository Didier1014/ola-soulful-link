import { createFileRoute } from "@tanstack/react-router";

// Webhook VPay — o estado é SEMPRE re-verificado na API VPay antes de creditar.
export const Route = createFileRoute("/api/public/vpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: any = await request.json().catch(() => ({}));
          const d = body?.data ?? body;
          const ref = d?.orderId || d?.order_id || d?.order?.id || d?.id;
          if (!ref) return Response.json({ ok: false, reason: "no_reference" });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { netshopCheck } = await import("@/lib/netshop.server");
          const { data: tx } = await supabaseAdmin
            .from("transactions")
            .select("id,user_id,net_mzn,status,metadata,external_ref")
            .eq("external_ref", String(ref)).maybeSingle();
          if (!tx) return Response.json({ ok: false, reason: "tx_not_found" });
          if (tx.status !== "pending") return Response.json({ ok: true, already: true });

          const st = await netshopCheck(String(ref));
          if (st === "failed") {
            await supabaseAdmin.from("transactions").update({
              status: "failed",
              metadata: { ...((tx.metadata ?? {}) as any), failed_reason: "Pagamento não concluído na VPay" },
            }).eq("id", tx.id).eq("status", "pending");
            return Response.json({ ok: true });
          }
          if (st !== "paid") return Response.json({ ok: true, pending: true });

          const { data: changed } = await supabaseAdmin.from("transactions")
            .update({ status: "paid" }).eq("id", tx.id).eq("status", "pending").select("id").maybeSingle();
          if (!changed) return Response.json({ ok: true, already: true });

          const { data: prof } = await supabaseAdmin.from("profiles").select("balance_mzn").eq("id", tx.user_id).maybeSingle();
          await supabaseAdmin.from("profiles")
            .update({ balance_mzn: Number(prof?.balance_mzn ?? 0) + Number(tx.net_mzn) }).eq("id", tx.user_id);

          const meta = (tx.metadata ?? {}) as any;
          if (meta?.source === "merchant_api" && meta?.webhook_url) {
            try {
              await fetch(String(meta.webhook_url), {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "paid", partner_transaction_id: tx.external_ref }),
              });
            } catch (e) { console.log("[vpay-webhook] merchant forward failed", e); }
          } else {
            try {
              const { notifyNewSale } = await import("@/lib/sale-notify.server");
              await notifyNewSale(supabaseAdmin, tx.id);
            } catch (e) { console.log("[vpay-webhook] notifyNewSale failed", e); }
          }
          return Response.json({ ok: true });
        } catch (e) {
          console.log("[vpay-webhook] error", e);
          return Response.json({ ok: false }, { status: 200 });
        }
      },
    },
  },
});
