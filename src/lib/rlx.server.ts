// RLX Checkout API helper — server-only.
// Docs: https://checkout.rlxl.ink/docs.php
// Endpoint: POST https://checkout.rlxl.ink/api.php
// Auth: Authorization: Bearer ${RLX_API_TOKEN}
// Actions:
//   - action="pay"   { phone, amount, nome_cliente, webhook_url } -> { txid, status, ... }
//   - action="check" { txid }                                      -> { status, ... }
// Webhook event: payment.success { txid, valor_bruto, valor_liquido, taxa_rlx }

const BASE = process.env.RLX_API_BASE || "https://checkout.rlxl.ink/api.php";

export type RlxMethod = "mpesa" | "emola";

export interface RlxResponse {
  txid?: string;
  status?: string;
  message?: string;
  error?: string;
  [k: string]: unknown;
}

function getToken() {
  const t = process.env.RLX_API_TOKEN;
  if (!t) throw new Error("RLX_API_TOKEN não configurada");
  return t;
}

function digits(s: string) {
  return s.replace(/\D/g, "");
}

export function formatPhone(phone: string) {
  const d = digits(phone);
  const local = d.startsWith("258") ? d.slice(3) : d;
  return `258${local}`;
}

async function rlxPost(payload: Record<string, unknown>) {
  const token = getToken();
  const body = JSON.stringify(payload);
  console.log("[RLX] →", JSON.stringify({ ...payload }));
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  });
  const raw = await res.text();
  console.log("[RLX] ← HTTP", res.status, raw);
  let data: RlxResponse = {};
  try { data = JSON.parse(raw); } catch { /* not json */ }
  return { http: res.status, ok: res.ok, raw, data };
}

export async function rlxPay(args: {
  method: RlxMethod;
  phone: string;
  amount: number | string;
  nome_cliente: string;
  webhook_url?: string;
}) {
  return rlxPost({
    action: "pay",
    method: args.method,
    phone: formatPhone(args.phone),
    amount: String(args.amount),
    nome_cliente: args.nome_cliente,
    webhook_url: args.webhook_url,
  });
}

export async function rlxCheck(txid: string) {
  return rlxPost({ action: "check", txid });
}

export function mapRlxStatus(s?: string): "paid" | "failed" | "pending" {
  const t = String(s ?? "").toLowerCase();
  if (/success|paid|completed|approved|aprovad|pago/.test(t)) return "paid";
  if (/fail|error|cancel|reject|rejeitad|expirad|falh|invalid/.test(t)) return "failed";
  return "pending";
}

// Ping/status — usa action=check com txid vazio só para validar o token/endpoint.
export async function rlxPing() {
  const token = process.env.RLX_API_TOKEN;
  if (!token) return { ok: false, http: 0, message: "RLX_API_TOKEN não configurada" };
  try {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "check", txid: "ping" }),
    });
    return { ok: res.status < 500, http: res.status };
  } catch (e) {
    return { ok: false, http: 0, message: e instanceof Error ? e.message : "sem resposta" };
  }
}
