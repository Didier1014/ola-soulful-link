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

export async function rlxPay(input: RlxPayInput) {
  return call({ action: "pay", ...input });
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
