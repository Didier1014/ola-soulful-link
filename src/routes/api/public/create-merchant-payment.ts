import { createFileRoute } from "@tanstack/react-router";

// POST /api/public/create-merchant-payment
// Headers: x-merchant-api-key: rdx_live_...
// Body: { phone, amount, nome_cliente, customer_email?, webhook_url? }
// Returns (merchant only): { status, partner_transaction_id }

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
        const startedAt = Date.now();
        const { logMerchantApiCall } = await import("@/lib/merchant-api-log.server");
        let merchantId: string | null = null;
        const apiKey = request.headers.get("x-merchant-api-key")?.trim() || null;
        const log = (statusCode: number) =>
          logMerchantApiCall({ request, endpoint: "create-merchant-payment", userId: merchantId, apiKey, statusCode, startedAt });
        try {
          if (!apiKey || !apiKey.startsWith("rdx_")) {
            await log(401);
            return Response.json({ error: "unauthorized" }, { status: 401 });
          }

          const body = await request.json().catch(() => ({} as any));
          const phone = normalizePhone(body?.phone);
          const nome_cliente = String(body?.nome_cliente || "").trim();
          const amount = Number(body?.amount);
          const customer_email = body?.customer_email ? String(body.customer_email).trim() : "";
          const webhook_url = body?.webhook_url ? String(body.webhook_url) : null;

          if (!nome_cliente) { await log(400); return Response.json({ error: "nome_cliente obrigatório" }, { status: 400 }); }
          if (!phone || phone.length < 9) { await log(400); return Response.json({ error: "phone inválido" }, { status: 400 }); }
          if (!Number.isFinite(amount) || amount < 50) { await log(400); return Response.json({ error: "amount mínimo 50" }, { status: 400 }); }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: merchant } = await supabaseAdmin
            .from("profiles")
            .select("id,api_key_active,is_merchant,payout_mpesa_phone,payout_emola_phone,merchant_fee_percent,merchant_fee_fixed")
            .eq("api_key", apiKey)
            .eq("api_key_active", true)
            .maybeSingle();
          if (!merchant) { await log(401); return Response.json({ error: "unauthorized" }, { status: 401 }); }
          merchantId = (merchant as any).id;
          if (!(merchant as any).is_merchant) {
            await log(403);
            return Response.json({ error: "forbidden: conta não habilitada para merchant API" }, { status: 403 });
          }

          const mpesaPhone = (merchant as any).payout_mpesa_phone
            ? normalizePhone((merchant as any).payout_mpesa_phone) : "";
          const emolaPhone = (merchant as any).payout_emola_phone
            ? normalizePhone((merchant as any).payout_emola_phone) : "";
          if (!mpesaPhone && !emolaPhone) {
            await log(422);
            return Response.json({ error: "merchant sem métodos de payout configurados" }, { status: 422 });
          }

          // Fees (internos, nunca expostos). Taxa do comerciante é configurável por perfil.
          const feePct = Number((merchant as any).merchant_fee_percent ?? 15);
          const feeFix = Number((merchant as any).merchant_fee_fixed ?? 0);
          const taxa_gateway = r2(amount * 0.12 + 12);
          const taxa_comerciante = r2(amount * (feePct / 100) + feeFix);
          const payout_comerciante = r2(amount - taxa_comerciante);
          const admin_residual = r2(amount - taxa_gateway - payout_comerciante);

          const { pagajaCharge, methodFromPhone } = await import("@/lib/pagaja.server");
          const method = methodFromPhone(phone);
          const payoutPhone = method === "mpesa" ? (mpesaPhone || emolaPhone) : (emolaPhone || mpesaPhone);

          let charge: Awaited<ReturnType<typeof pagajaCharge>>;
          try {
            charge = await pagajaCharge({
              amount,
              customer_name: nome_cliente,
              customer_email: customer_email || undefined,
              customer_phone: phone,
              description: "Pagamento merchant API",
              method,
            });
          } catch (e) {
            console.log("[create-merchant-payment] gateway error", e);
            await log(502);
            return Response.json({ error: "gateway_error" }, { status: 502 });
          }

          const partner_transaction_id = charge.reference;

          const { error: insErr } = await supabaseAdmin.from("transactions").insert({
            user_id: merchant.id,
            customer_name: nome_cliente,
            customer_phone: phone,
            method,
            amount_mzn: amount,
            fee_mzn: taxa_comerciante,
            net_mzn: payout_comerciante,
            status: charge.paid ? "paid" : "pending",
            external_ref: partner_transaction_id,
            metadata: {
              source: "merchant_api",
              webhook_url,
              gateway: "pagaja",
              test_mode: charge.test_mode,
              taxa_gateway,
              taxa_comerciante,
              payout_comerciante,
              admin_residual,
              payout_phone: payoutPhone,
              payout_method: method,
            },
          });
          if (insErr) console.log("[create-merchant-payment] insert error", insErr.message);

          await log(200);
          return Response.json({
            status: charge.paid ? "paid" : "pending",
            partner_transaction_id,
          });
        } catch (e) {
          console.log("[create-merchant-payment] error", e);
          await log(500);
          return Response.json({ error: "internal" }, { status: 500 });
        }
      },
    },
  },
});
