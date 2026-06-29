// RLX Webhook — recebe payment.success/failed.
// SEGURANÇA: valida HMAC-SHA256(body, GATEWAY_WEBHOOK_SECRET) contra o
// header `x-rlx-signature` (timingSafeEqual). Sem assinatura válida → 401
// e nenhuma transacção é tocada.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.GATEWAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[RLX webhook] GATEWAY_WEBHOOK_SECRET não configurada — rejeitando");
    return false;
  }
  if (!signature) return false;
  const sig = signature.replace(/^sha256=/, "").trim().toLowerCase();
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  try { return timingSafeEqual(a, b); } catch { return false; }
}

export const Route = createFileRoute("/api/public/rlx-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const sigHeader =
          request.headers.get("x-rlx-signature") ||
          request.headers.get("x-webhook-signature") ||
          request.headers.get("x-signature");

        if (!verifySignature(rawBody, sigHeader)) {
          console.warn("[RLX webhook] invalid_signature", {
            ip: request.headers.get("x-forwarded-for"),
            sig_present: !!sigHeader,
          });
          return new Response("invalid signature", { status: 401 });
        }

        let payload: any = {};
        try { payload = JSON.parse(rawBody); } catch { return new Response("invalid json", { status: 400 }); }
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
            // Atomic balance increment — sem race condition
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
