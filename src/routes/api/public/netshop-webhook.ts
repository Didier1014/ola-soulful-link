import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Webhook NetShop — eventos charge.paid / charge.failed
// Header: X-NetShop-Signature (HMAC-SHA256 do corpo cru)
export const Route = createFileRoute("/api/public/netshop-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.text();
          const secret = process.env.NETSHOP_WEBHOOK_SECRET;
          const header = (request.headers.get("x-netshop-signature") || "").trim();

          if (secret) {
            const expected = createHmac("sha256", secret).update(raw).digest("hex");
            const given = header.replace(/^sha256=/, "");
            const a = Buffer.from(given, "utf8");
            const b = Buffer.from(expected, "utf8");
            if (a.length !== b.length || !timingSafeEqual(a, b)) {
              return Response.json({ ok: false, reason: "invalid_signature" }, { status: 401 });
            }
          }

          const body = JSON.parse(raw || "{}");
          const event = String(body?.event || body?.type || "");
          const data = body?.data ?? body;
          const ref = data?.id || data?.charge_id || data?.reference;
          if (!ref) return Response.json({ ok: false, reason: "no_reference" }, { status: 200 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: tx } = await supabaseAdmin
            .from("transactions")
            .select("id,user_id,net_mzn,status,metadata,external_ref")
            .eq("external_ref", String(ref))
            .maybeSingle();
          if (!tx) return Response.json({ ok: false, reason: "tx_not_found" }, { status: 200 });

          if (event === "charge.failed" || String(data?.status).toLowerCase() === "failed") {
            if (tx.status === "pending") {
              await supabaseAdmin
                .from("transactions")
                .update({
                  status: "failed",
                  metadata: { ...((tx.metadata ?? {}) as any), failed_reason: data?.failed_reason ?? null },
                })
                .eq("id", tx.id)
                .eq("status", "pending");
            }
            return Response.json({ ok: true });
          }

          if (event !== "charge.paid" && String(data?.status).toLowerCase() !== "paid") {
            return Response.json({ ok: false, reason: "ignored" }, { status: 200 });
          }
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
              console.log("[netshop-webhook] merchant forward failed", e);
            }
          } else {
            try {
              const { notifyNewSale } = await import("@/lib/sale-notify.server");
              await notifyNewSale(supabaseAdmin, tx.id);
            } catch (e) {
              console.log("[netshop-webhook] notifyNewSale failed", e);
            }
          }
          return Response.json({ ok: true });
        } catch (e) {
          console.log("[netshop-webhook] error", e);
          return Response.json({ ok: false, error: String(e) }, { status: 200 });
        }
      },
    },
  },
});
