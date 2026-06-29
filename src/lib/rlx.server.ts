// RLX Checkout API helper — server-only.
// Docs: https://checkout.rlxl.ink/docs.php
// Endpoint: POST https://checkout.rlxl.ink/api.php
// Auth: Authorization: Bearer ${RLX_API_TOKEN}
// Pay:   { action:"pay", phone, amount, nome_cliente, webhook_url?, payout_phone_mpesa?, payout_phone_emola? }
// Check: { action:"check", txid }
// Telefone: 9 dígitos locais (84/85 M-Pesa, 86/87 e-Mola). A RLX infere o canal pelo prefixo.
// Mínimo C2B: 50 MT. Taxa RLX: 11.99% + 11.99 MT.

const BASE = process.env.RLX_API_BASE || "https://checkout.rlxl.ink/api.php";

export type RlxMethod = "mpesa" | "emola";

export interface RlxResponse {
  txid?: string;
  partner_transaction_id?: string;
  status?: string;
  event?: string;
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

// Doc: telefone em 9 dígitos locais (ex: "841234567"). Sem prefixo 258.
export function formatPhone(phone: string) {
  const d = digits(phone);
  return d.startsWith("258") ? d.slice(3) : d;
}

async function rlxPost(payload: Record<string, unknown>) {
  const token = getToken();
  console.log("[RLX] →", JSON.stringify(payload));
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  console.log("[RLX] ← HTTP", res.status, raw);
  let data: RlxResponse = {};
  try { data = JSON.parse(raw); } catch { /* not json */ }
  return { http: res.status, ok: res.ok, raw, data };
}

export async function rlxPay(args: {
  phone: string;
  amount: number | string;
  nome_cliente: string;
  webhook_url?: string;
  payout_phone_mpesa?: string;
  payout_phone_emola?: string;
  splits?: Array<{ phone: string; amount: number | string }>;
}) {
  const payload: Record<string, unknown> = {
    action: "pay",
    phone: formatPhone(args.phone),
    amount: String(args.amount),
    nome_cliente: args.nome_cliente,
  };
  if (args.webhook_url) payload.webhook_url = args.webhook_url;
  if (args.payout_phone_mpesa) payload.payout_phone_mpesa = formatPhone(args.payout_phone_mpesa);
  if (args.payout_phone_emola) payload.payout_phone_emola = formatPhone(args.payout_phone_emola);
  if (args.splits && args.splits.length) {
    payload.splits = args.splits.map((s) => ({
      phone: formatPhone(s.phone),
      amount: String(s.amount),
    }));
  }
  return rlxPost(payload);
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

// Ping para healthcheck — usa action=check com txid dummy só para validar token/endpoint.
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
