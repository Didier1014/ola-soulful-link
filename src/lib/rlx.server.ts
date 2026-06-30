// RLX gateway client — checkout.rlxl.ink
// Endpoint: https://checkout.rlxl.ink/api.php
// Auth: Authorization: Bearer ${RLX_API_TOKEN}
//
// Payload oficial do "pay" (https://checkout.rlxl.ink/docs.php):
//   action="pay" (obrigatório)
//   phone (obrigatório, 9 dígitos locais)
//   amount (obrigatório, mínimo 50.00 MT)
//   nome_cliente (obrigatório)
//   payout_phone_mpesa / payout_phone_emola (opcional)
//   webhook_url (opcional)
//   splits (opcional)
// NÃO existe campo "reference" — o ID é gerado pelo rlxPay e devolvido em partner_transaction_id.

const RLX_URL = "https://checkout.rlxl.ink/api.php";

function token() {
  const t = process.env.RLX_API_TOKEN;
  if (!t) throw new Error("RLX_API_TOKEN não configurado");
  return t;
}

export type RlxPayInput = {
  phone: string;
  amount: number;
  nome_cliente: string;
  webhook_url?: string;
  payout_phone_mpesa?: string;
  payout_phone_emola?: string;
};

async function call(body: Record<string, unknown>) {
  const res = await fetch(RLX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!res.ok) {
    console.log("[rlx] HTTP error", res.status, "body=", text, "request=", JSON.stringify(body));
    throw new Error(`RLX ${res.status}: ${json?.message || json?.msg || text || "erro"}`);
  }
  if (json && typeof json === "object" && String(json.status).toLowerCase() === "error") {
    console.log("[rlx] gateway error response=", text, "request=", JSON.stringify(body));
    throw new Error(`RLX: ${json.msg || json.message || "erro desconhecido"}`);
  }
  return json ?? {};
}

// RLX espera 9 dígitos locais. Remove prefixos 258/+258/00258.
function normalizePhone(raw: string) {
  let n = String(raw || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("258") && n.length > 9) n = n.slice(3);
  return n;
}

export async function rlxPay(input: RlxPayInput) {
  const phone = normalizePhone(input.phone);
  const nome = String(input.nome_cliente || "").trim();
  if (!nome) throw new Error("nome_cliente é obrigatório");
  if (!phone || phone.length < 9) throw new Error("Telefone inválido (9 dígitos)");
  const amt = Number(input.amount);
  if (!Number.isFinite(amt) || amt < 50) throw new Error("Valor mínimo: 50.00 MT");
  const amount = amt.toFixed(2); // ex: "100.00"

  const payload: Record<string, unknown> = {
    action: "pay",
    phone,
    amount,
    nome_cliente: nome,
    webhook_url: input.webhook_url || "https://redoxpay.lovable.app/api/public/rlx-webhook",
  };
  if (input.payout_phone_mpesa) payload.payout_phone_mpesa = input.payout_phone_mpesa;
  if (input.payout_phone_emola) payload.payout_phone_emola = input.payout_phone_emola;

  console.log("[rlxPay] payload=", JSON.stringify(payload));
  const r = await call(payload);
  console.log("[rlxPay] response=", JSON.stringify(r));
  return r;
}

export async function rlxCheck(txid: string) {
  return call({ action: "check", txid });
}

export async function rlxStatus() {
  const t0 = Date.now();
  try {
    await call({ action: "check", txid: "ping" });
    return { ok: true, configured: true, latency_ms: Date.now() - t0 };
  } catch (e) {
    return {
      ok: false,
      configured: !!process.env.RLX_API_TOKEN,
      latency_ms: Date.now() - t0,
      message: e instanceof Error ? e.message : "erro",
    };
  }
}
