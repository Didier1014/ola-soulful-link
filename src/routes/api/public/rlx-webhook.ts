// RLX Webhook — recebe payment.success/failed.
// Aceita POST simples conforme doc oficial da RLX (sem verificação HMAC).
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/rlx-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: any = {};
        try { payload = await request.json(); } catch { return new Response("invalid json", { status: 400 }); }
        console.log("[RLX webhook] ←", JSON.stringify(payload));

        const event = String(payload?.event ?? payload?.type ?? "").toLowerCase();
        const txid = String(payload?.txid ?? payload?.data?.txid ?? "");
        if (!txid) return new Response("missing txid", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: tx } = await supabaseAdmin
          .from("transactions")
          .select("id,user_id,product_id,net_mzn,status")
          .eq("external_ref", txid)
          .maybeSingle();
        if (!tx) return new Response("tx not found", { status: 404 });

        if (event.includes("success") || event.includes("paid")) {
          if (tx.status === "paid") return new Response("ok", { status: 200 });
          const { data: changed } = await supabaseAdmin
            .from("transactions")
            .update({ status: "paid" })
            .eq("id", tx.id)
            .eq("status", "pending")
            .select("id")
            .maybeSingle();
          if (changed) {
            await supabaseAdmin.rpc("increment_balance", {
              _user_id: tx.user_id,
              _amount: Number(tx.net_mzn ?? 0),
            });
            try {
              const { notifyNewSale } = await import("@/lib/sale-notify.server");
              await notifyNewSale(supabaseAdmin, tx.id);
            } catch (e) {
              console.log("[RLX webhook] notifyNewSale error", e);
            }
          }
          return new Response("ok", { status: 200 });
        }

        if (event.includes("fail") || event.includes("cancel") || event.includes("reject")) {
          await supabaseAdmin.from("transactions").update({ status: "failed" }).eq("id", tx.id);
          return new Response("ok", { status: 200 });
        }

        return new Response("ignored", { status: 200 });
      },
    },
  },
});
