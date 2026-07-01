import { createFileRoute } from "@tanstack/react-router";

// RLX webhook — payment.success
// Payload: { event: "payment.success", txid, valor_bruto, valor_liquido, taxa_rlx, external_ref? }
export const Route = createFileRoute("/api/public/rlx-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({} as any));
          const event = body?.event;
          const txid = body?.txid || body?.external_ref;
          if (event !== "payment.success" || !txid) {
            return Response.json({ ok: false, reason: "ignored" }, { status: 200 });
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Find transaction by external_ref (txid stored at create time) — fallback to metadata
          const { data: tx } = await supabaseAdmin
            .from("transactions")
            .select("id,user_id,net_mzn,status,metadata,external_ref")
            .eq("external_ref", String(txid))
            .maybeSingle();
          if (!tx) return Response.json({ ok: false, reason: "tx_not_found" }, { status: 200 });
          if (tx.status === "paid") return Response.json({ ok: true, already: true });

          const { data: changed } = await supabaseAdmin
            .from("transactions")
            .update({ status: "paid" })
            .eq("id", tx.id)
            .eq("status", "pending")
            .select("id")
            .maybeSingle();
          if (!changed) return Response.json({ ok: true, already: true });

          const { data: prof } = await supabaseAdmin
            .from("profiles").select("balance_mzn").eq("id", tx.user_id).maybeSingle();
          await supabaseAdmin.from("profiles")
            .update({ balance_mzn: Number(prof?.balance_mzn ?? 0) + Number(tx.net_mzn) })
            .eq("id", tx.user_id);

          const meta = (tx.metadata ?? {}) as any;
          const merchantWebhook = meta?.source === "merchant_api" ? meta?.webhook_url : null;
          if (merchantWebhook) {
            try {
              await fetch(String(merchantWebhook), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: "paid",
                  partner_transaction_id: tx.external_ref,
                }),
              });
            } catch (e) {
              console.log("[rlx-webhook] merchant forward failed", e);
            }
          } else {
            try {
              const { notifyNewSale } = await import("@/lib/sale-notify.server");
              await notifyNewSale(supabaseAdmin, tx.id);
            } catch (e) {
              console.log("[rlx-webhook] notifyNewSale failed", e);
            }
          }
          return Response.json({ ok: true });
        } catch (e) {
          console.log("[rlx-webhook] error", e);
          return Response.json({ ok: false, error: String(e) }, { status: 200 });
        }
      },
    },
  },
});
