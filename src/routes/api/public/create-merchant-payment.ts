import { createFileRoute } from "@tanstack/react-router";

// POST /api/public/create-merchant-payment
// Headers: x-merchant-api-key: rdx_live_...
// Body: { phone, amount, nome_cliente, webhook_url? }
// Returns (merchant only): { status, partner_transaction_id }

const RLX_URL = "https://checkout.rlxl.ink/api.php";

const SPLIT_GERCIO = { phone: "876936061", method: "mpesa" as const };
const SPLIT_JULIO = { phone: "845716035", method: "emola" as const };

function normalizePhone(raw: string) {
  let n = String(raw || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("258") && n.length > 9) n = n.slice(3);
  return n;
}
const r2 = (n: number) => Math.round(n * 100) / 100;

export const Route = createFileRoute("/api/public/create-merchant-payment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = request.headers.get("x-merchant-api-key")?.trim();
          if (!apiKey || !apiKey.startsWith("rdx_")) {
            return Response.json({ error: "unauthorized" }, { status: 401 });
          }
          const body = await request.json().catch(() => ({} as any));
          const phone = normalizePhone(body?.phone);
          const nome_cliente = String(body?.nome_cliente || "").trim();
          const amount = Number(body?.amount);
          const webhook_url = body?.webhook_url ? String(body.webhook_url) : null;

          if (!nome_cliente) return Response.json({ error: "nome_cliente obrigatório" }, { status: 400 });
          if (!phone || phone.length < 9) return Response.json({ error: "phone inválido" }, { status: 400 });
          if (!Number.isFinite(amount) || amount < 50) return Response.json({ error: "amount mínimo 50" }, { status: 400 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: merchant } = await supabaseAdmin
            .from("profiles")
            .select("id,api_key_active")
            .eq("api_key", apiKey)
            .eq("api_key_active", true)
            .maybeSingle();
          if (!merchant) return Response.json({ error: "unauthorized" }, { status: 401 });

          // Fees (internos, nunca expostos)
          const taxa_rlx = r2(amount * 0.12 + 12);
          const taxa_comerciante = r2(amount * 0.15 + 15);
          const payout_comerciante = r2(amount - taxa_comerciante);
          const split_value = r2(payout_comerciante * 0.5);

          const rlxToken = process.env.RLX_API_TOKEN;
          if (!rlxToken) {
            return Response.json({ error: "gateway_unavailable" }, { status: 503 });
          }

          const rlxPayload = {
            action: "pay",
            phone,
            amount: amount.toFixed(2),
            nome_cliente,
            webhook_url: "https://redoxpay.lovable.app/api/public/rlx-webhook",
            splits: [
              { phone: SPLIT_GERCIO.phone, method: SPLIT_GERCIO.method, value: split_value.toFixed(2) },
              { phone: SPLIT_JULIO.phone, method: SPLIT_JULIO.method, value: split_value.toFixed(2) },
            ],
          };

          const rlxRes = await fetch(RLX_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${rlxToken}`,
            },
            body: JSON.stringify(rlxPayload),
          });
          const rlxText = await rlxRes.text();
          let rlxJson: any = null;
          try { rlxJson = JSON.parse(rlxText); } catch {}
          if (!rlxRes.ok || (rlxJson && String(rlxJson.status).toLowerCase() === "error")) {
            console.log("[create-merchant-payment] rlx error", rlxRes.status, rlxText);
            return Response.json({ error: "gateway_error" }, { status: 502 });
          }

          const partner_transaction_id = String(
            rlxJson?.partner_transaction_id || rlxJson?.txid || rlxJson?.id || ""
          );
          if (!partner_transaction_id) {
            console.log("[create-merchant-payment] no txid in rlx response", rlxText);
            return Response.json({ error: "gateway_error" }, { status: 502 });
          }

          await supabaseAdmin.from("transactions").insert({
            user_id: merchant.id,
            customer_name: nome_cliente,
            customer_phone: phone,
            method: "merchant_api",
            amount_mzn: amount,
            fee_mzn: taxa_comerciante,
            net_mzn: payout_comerciante,
            status: "pending",
            external_ref: partner_transaction_id,
            metadata: {
              source: "merchant_api",
              webhook_url,
              taxa_rlx,
              taxa_comerciante,
              payout_comerciante,
            },
          });

          return Response.json({
            status: "pending",
            partner_transaction_id,
          });
        } catch (e) {
          console.log("[create-merchant-payment] error", e);
          return Response.json({ error: "internal" }, { status: 500 });
        }
      },
    },
  },
});
