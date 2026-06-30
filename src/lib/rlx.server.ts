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

function normalizePhone(raw: string) {
  let n = String(raw || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.length === 9 && /^8[2-7]/.test(n)) n = "258" + n;
  return n;
}

export async function rlxPay(input: RlxPayInput) {
  const numero = normalizePhone(input.phone);
  console.log("[rlxPay] numero=", numero, "amount=", input.amount);
  const r = await call({
    action: "pay",
    numero,
    amount: input.amount,
    nome_cliente: input.nome_cliente,
    webhook_url: input.webhook_url,
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
