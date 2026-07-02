import { createFileRoute } from "@tanstack/react-router";

// POST /api/public/create-merchant-payment
// Headers: x-merchant-api-key: rdx_live_...
// Body: { phone, amount, nome_cliente, webhook_url? }
// Returns (merchant only): { status, partner_transaction_id }

const RLX_URL = "https://checkout.rlxl.ink/api.php";

type SplitMethod = "mpesa" | "emola";

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
            .select("id,api_key_active,payout_mpesa_phone,payout_emola_phone,merchant_fee_percent,merchant_fee_fixed")
            .eq("api_key", apiKey)
            .eq("api_key_active", true)
            .maybeSingle();
          if (!merchant) return Response.json({ error: "unauthorized" }, { status: 401 });

          const mpesaPhone = (merchant as any).payout_mpesa_phone
            ? normalizePhone((merchant as any).payout_mpesa_phone) : "";
          const emolaPhone = (merchant as any).payout_emola_phone
            ? normalizePhone((merchant as any).payout_emola_phone) : "";
          if (!mpesaPhone && !emolaPhone) {
            return Response.json({ error: "merchant sem métodos de payout configurados" }, { status: 422 });
          }

          // Fees (internos, nunca expostos). Taxa do comerciante é configurável por perfil.
          const feePct = Number((merchant as any).merchant_fee_percent ?? 15);
          const feeFix = Number((merchant as any).merchant_fee_fixed ?? 15);
          const taxa_rlx = r2(amount * 0.12 + 12);
          const taxa_comerciante = r2(amount * (feePct / 100) + feeFix);
          const payout_comerciante = r2(amount - taxa_comerciante);

          // O RLX exige que o método dos splits coincida com o canal do cliente
          // (M-Pesa: prefixos 84/85 · e-Mola: 86/87).
          const p2 = phone.slice(0, 2);
          const channel: SplitMethod | null =
            p2 === "84" || p2 === "85" ? "mpesa" :
            p2 === "86" || p2 === "87" ? "emola" : null;
          if (!channel) {
            return Response.json({ error: "phone inválido (prefixo desconhecido)" }, { status: 400 });
          }
          const payoutPhone = channel === "mpesa" ? mpesaPhone : emolaPhone;
          if (!payoutPhone) {
            return Response.json({ error: `merchant sem payout ${channel} configurado para este canal` }, { status: 422 });
          }
          const rlxToken = process.env.RLX_API_TOKEN;
          if (!rlxToken) {
            return Response.json({ error: "gateway_unavailable" }, { status: 503 });
          }

          // Alguns prefixos foram portados entre operadoras — a nossa detecção por
          // prefixo pode divergir do canal que o RLX realmente atribui ao número.
          // Fazemos uma tentativa com o método detectado e, se o RLX responder
          // "método de split deve coincidir com o canal de recebimento", tentamos
          // com o método oposto (desde que o merchant tenha esse payout configurado).
          const tryChannel = async (m: SplitMethod, ph: string) => {
            const splits = [{ phone: ph, method: m, value: payout_comerciante.toFixed(2) }];
            const res = await fetch(RLX_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${rlxToken}` },
              body: JSON.stringify({
                action: "pay",
                phone,
                amount: amount.toFixed(2),
                nome_cliente,
                webhook_url: "https://redoxpay.lovable.app/api/public/rlx-webhook",
                splits,
              }),
            });
            const text = await res.text();
            let json: any = null;
            try { json = JSON.parse(text); } catch {}
            return { res, text, json, splits, method: m, phone: ph };
          };

          let attempt = await tryChannel(channel, payoutPhone);
          const isMismatch =
            attempt.json && String(attempt.json.status).toLowerCase() === "error"
            && /coincidir com o canal/i.test(String(attempt.json.msg || ""));
          if (isMismatch) {
            const alt: SplitMethod = channel === "mpesa" ? "emola" : "mpesa";
            const altPhone = alt === "mpesa" ? mpesaPhone : emolaPhone;
            if (altPhone) {
              console.log("[create-merchant-payment] retry with alt channel", alt);
              attempt = await tryChannel(alt, altPhone);
            }
          }

          const { res: rlxRes, text: rlxText, json: rlxJson, splits, method: usedMethod, phone: usedPayoutPhone } = attempt;
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

          const { error: insErr } = await supabaseAdmin.from("transactions").insert({
            user_id: merchant.id,
            customer_name: nome_cliente,
            customer_phone: phone,
            method: usedMethod,
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
              payout_phone: usedPayoutPhone,
              payout_method: usedMethod,
              splits,
            },
          });
          if (insErr) console.log("[create-merchant-payment] insert error", insErr.message);

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
