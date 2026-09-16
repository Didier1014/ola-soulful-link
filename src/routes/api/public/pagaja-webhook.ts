import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Webhook Pagaja — evento payment.completed
// Header: x-pagaja-signature: t=TIMESTAMP,v1=HMAC_SHA256("{t}.{rawBody}", secret)
export const Route = createFileRoute("/api/public/pagaja-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.text();
          const secret = process.env.PAGAJA_WEBHOOK_SECRET;
          const header = request.headers.get("x-pagaja-signature") || "";

          if (secret) {
            const parts = header.split(",");
            const t = (parts.find((p) => p.trim().startsWith("t=")) || "").replace("t=", "").trim();
            const v1 = (parts.find((p) => p.trim().startsWith("v1=")) || "").replace("v1=", "").trim();
            if (!t || !v1) return Response.json({ ok: false, reason: "missing_signature" }, { status: 401 });
            const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
            const a = Buffer.from(v1, "utf8");
            const b = Buffer.from(expected, "utf8");
            if (a.length !== b.length || !timingSafeEqual(a, b)) {
              return Response.json({ ok: false, reason: "invalid_signature" }, { status: 401 });
            }
          }

          const body = JSON.parse(raw || "{}");
          if (body?.event !== "payment.completed") {
            return Response.json({ ok: false, reason: "ignored" }, { status: 200 });
          }
          const ref = body?.data?.id || body?.data?.reference;
          if (!ref) return Response.json({ ok: false, reason: "no_reference" }, { status: 200 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: tx } = await supabaseAdmin
            .from("transactions")
            .select("id,user_id,net_mzn,status,metadata,external_ref")
            .eq("external_ref", String(ref))
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
                body: JSON.stringify({ status: "paid", partner_transaction_id: tx.external_ref }),
              });
            } catch (e) {
              console.log("[pagaja-webhook] merchant forward failed", e);
            }
          } else {
            try {
              const { notifyNewSale } = await import("@/lib/sale-notify.server");
              await notifyNewSale(supabaseAdmin, tx.id);
            } catch (e) {
              console.log("[pagaja-webhook] notifyNewSale failed", e);
            }
          }
          return Response.json({ ok: true });
        } catch (e) {
          console.log("[pagaja-webhook] error", e);
          return Response.json({ ok: false, error: String(e) }, { status: 200 });
        }
      },
    },
  },
});
