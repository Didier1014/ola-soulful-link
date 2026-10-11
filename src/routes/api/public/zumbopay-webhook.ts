import { createFileRoute } from "@tanstack/react-router";

// Webhook ZumboPay. Não confia no corpo: extrai a referência e confirma o
// estado directamente no gateway antes de alterar qualquer transacção.
export const Route = createFileRoute("/api/public/zumbopay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: any = await request.json().catch(() => ({}));
          const d = body?.data ?? body ?? {};
          const reference = String(d?.reference || d?.payment_reference || body?.reference || "").slice(0, 200);
          if (!reference) return Response.json({ ok: true });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { netshopCheck } = await import("@/lib/netshop.server");

          const { data: tx } = await supabaseAdmin
            .from("transactions")
            .select("id,user_id,net_mzn,status,metadata")
            .eq("external_ref", reference)
            .maybeSingle();
          if (!tx || tx.status !== "pending") return Response.json({ ok: true });

          const st = await netshopCheck(reference);
          if (st === "paid") {
            const { data: changed } = await supabaseAdmin
              .from("transactions")
              .update({ status: "paid" })
              .eq("id", tx.id)
              .eq("status", "pending")
              .select("id")
              .maybeSingle();
            if (changed) {
              const { data: prof } = await supabaseAdmin
                .from("profiles").select("balance_mzn").eq("id", tx.user_id).maybeSingle();
              await supabaseAdmin.from("profiles")
                .update({ balance_mzn: Number(prof?.balance_mzn ?? 0) + Number(tx.net_mzn) })
                .eq("id", tx.user_id);
              try {
                const { notifyNewSale } = await import("@/lib/sale-notify.server");
                await notifyNewSale(supabaseAdmin, tx.id);
              } catch (e) { console.log("[zumbopay-webhook] notify failed", e); }
            }
          } else if (st === "failed") {
            await supabaseAdmin
              .from("transactions")
              .update({
                status: "failed",
                metadata: {
                  ...((tx.metadata ?? {}) as any),
                  failed_reason: "Pagamento falhado (gateway)",
                  failed_at: new Date().toISOString(),
                },
              })
              .eq("id", tx.id)
              .eq("status", "pending");
          }
          return Response.json({ ok: true });
        } catch (e) {
          console.log("[zumbopay-webhook] error", e);
          return Response.json({ ok: false }, { status: 200 });
        }
      },
    },
  },
});
