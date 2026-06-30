// RLX gateway client — checkout.rlxl.ink
// Endpoint: https://checkout.rlxl.ink/api.php
// Auth: Authorization: Bearer ${RLX_API_TOKEN}

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
  reference?: string;
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
    throw new Error(`RLX ${res.status}: ${json?.message || text || "erro"}`);
  }
  return json ?? {};
}

// RLX espera 9 dígitos locais (84/85 M-Pesa, 86/87 e-Mola). Removemos prefixos 258/+258/00258.
function normalizePhone(raw: string) {
  let n = String(raw || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("258") && n.length > 9) n = n.slice(3);
  return n;
}

export async function rlxPay(input: RlxPayInput) {
  const phone = normalizePhone(input.phone);
  // RLX exige reference entre 1 e 20 caracteres. Geramos curta: timestamp base36 + random.
  const reference = (input.reference && input.reference.length > 0 && input.reference.length <= 20)
    ? input.reference
    : (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).slice(0, 20);
  console.log("[rlxPay] phone=", phone, "amount=", input.amount, "ref=", reference);
  const r = await call({
    action: "pay",
    phone,
    amount: input.amount,
    nome_cliente: input.nome_cliente,
    webhook_url: input.webhook_url,
    reference,
    transaction_reference: reference,
    ref: reference,
  });
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
