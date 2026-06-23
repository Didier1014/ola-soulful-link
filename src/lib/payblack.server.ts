// PayBlack API helper — server-only.
// Base: https://payflax.site
// Docs (resumo do utilizador):
//   POST /api/pay          { api_key, method, phone, amount, payout_number, payout_method }
//   GET  /api/transactions (X-API-Key)  ?page&limit&status&method
//   GET  /api/balance      (X-API-Key)
//   GET  /api/customers    (X-API-Key)
//
// Resposta de /api/pay devolve: { "transacao": { id, status, amount, fee_amount,
// payout_amount, transaction_reference, created_at, ... } }

const BASE = process.env.PAYBLACK_BASE_URL || "https://payflax.site";

const PAYOUT_MPESA = process.env.PAYBLACK_PAYOUT_MPESA || "258858073241";
const PAYOUT_EMOLA = process.env.PAYBLACK_PAYOUT_EMOLA || "258869380845";

export type PayBlackMethod = "mpesa" | "emola";

export interface PayBlackPayResponse {
  id?: string | number;
  status?: "success" | "failed" | "pending" | string;
  amount?: number | string;
  fee_amount?: number | string;
  payout_amount?: number | string;
  transaction_reference?: string;
  created_at?: string;
  message?: string;
  error?: string;
  [k: string]: unknown;
}

function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function formatPhone(phone: string, method: PayBlackMethod) {
  const d = digits(phone);
  const local = d.startsWith("258") ? d.slice(3) : d;
  return method === "mpesa" ? `258${local}` : local;
}

function getKey() {
  const k = process.env.PAYBLACK_API_KEY;
  if (!k) throw new Error("PAYBLACK_API_KEY não configurada");
  return k;
}

export async function payblackPay(args: {
  method: PayBlackMethod;
  phone: string;
  amount: number | string;
}): Promise<{ http: number; raw: string; data: PayBlackPayResponse }> {
  const api_key = getKey();
  const body = {
    api_key,
    method: args.method === "mpesa" ? "mpesa_c2b" : "emola_c2b",
    phone: formatPhone(args.phone, args.method),
    amount: String(args.amount),
    payout_number: args.method === "mpesa" ? PAYOUT_MPESA : PAYOUT_EMOLA,
    payout_method: args.method === "mpesa" ? "mpesa_b2c" : "emola_b2c",
  };
  console.log("[PayBlack] → /api/pay", JSON.stringify({ ...body, api_key: "***" }));
  const res = await fetch(`${BASE}/api/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  console.log("[PayBlack] ← HTTP", res.status, raw); // sem slice — log completo para depurar
  let parsed: any = {};
  try { parsed = JSON.parse(raw); } catch { /* not json */ }
  // A PayBlack devolve { "transacao": { id, status, transaction_reference, ... } }.
  // Desembrulhar aqui — sem isto, resp.status/resp.id ficam sempre undefined.
  const data: PayBlackPayResponse = parsed?.transacao ?? parsed;
  return { http: res.status, raw, data };
}

export function mapPayBlackStatus(s?: string): "paid" | "failed" | "pending" {
  const t = String(s ?? "").toLowerCase();
  if (/success|paid|completed|approved|aprovad|pago/.test(t)) return "paid";
  if (/fail|error|cancel|reject|rejeitad|expirad|falh/.test(t)) return "failed";
  return "pending";
}

async function getJson(path: string, search?: Record<string, string | number | undefined>) {
  const api_key = getKey();
  const url = new URL(`${BASE}${path}`);
  if (search) for (const [k, v] of Object.entries(search)) if (v != null) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString(), { headers: { "X-API-Key": api_key, Accept: "application/json" } });
  const raw = await res.text();
  let data: any = {};
  try { data = JSON.parse(raw); } catch { data = { raw }; }
  return { http: res.status, ok: res.ok, data };
}

export const listPayblackTransactions = (q?: { page?: number; limit?: number; status?: string; method?: string }) =>
  getJson("/api/transactions", q);

export const getPayblackBalance = () => getJson("/api/balance");
export const listPayblackCustomers = (q?: { page?: number; limit?: number }) => getJson("/api/customers", q);

// Procura uma transacção PayBlack por reference (paginando algumas páginas).
export async function findPayblackTransaction(reference: string) {
  if (!reference) return null;
  for (let page = 1; page <= 3; page++) {
    const { ok, data } = await listPayblackTransactions({ page, limit: 100 });
    if (!ok) return null;
    const list: any[] = Array.isArray(data) ? data : (data?.transacoes ?? data?.data ?? data?.transactions ?? []);
    const found = list.find((t) => String(t.transaction_reference ?? t.reference ?? t.id) === String(reference));
    if (found) return found;
    if (!list.length || list.length < 100) break;
  }
  return null;
}
