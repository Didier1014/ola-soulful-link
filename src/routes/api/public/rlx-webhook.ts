// RLX Webhook — recebe payment.success e marca a transação como paga.
// URL pública: /api/public/rlx-webhook
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/rlx-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: any = {};
        try {
          payload = await request.json();
        } catch {
          return new Response("invalid json", { status: 400 });
        }
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
            const { data: prof } = await supabaseAdmin
              .from("profiles").select("balance_mzn").eq("id", tx.user_id).maybeSingle();
            await supabaseAdmin
              .from("profiles")
              .update({ balance_mzn: Number(prof?.balance_mzn ?? 0) + Number(tx.net_mzn ?? 0) })
              .eq("id", tx.user_id);
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
