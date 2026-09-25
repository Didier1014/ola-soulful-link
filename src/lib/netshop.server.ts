// Gateway ZumboPay — https://zumbopay.com/api/public/v1
// Auth: Authorization: Bearer zk_live_... + X-Merchant-Id
// Endpoints: POST /charges (STK push), GET /payments/{ref}, GET /merchant/validate
// (Nome do ficheiro mantido para não mexer nos imports existentes.)

const BASE = "https://zumbopay.com/api/public/v1";
const MERCHANT_ID = "MCH_3D82A8F40B";
const WALLET_MPESA = "0ad0f0a0-5b92-40c6-9ca4-caacee81641e";

export type NetshopMethod = "mpesa" | "emola" | "mkesh" | "card";

function creds() {
  const key = process.env.ZUMBOPAY_API_KEY;
  if (!key) throw new Error("Credenciais ZumboPay não configuradas");
  return {
    key,
    merchant: process.env.ZUMBOPAY_MERCHANT_ID || MERCHANT_ID,
    wallet: process.env.ZUMBOPAY_WALLET_MPESA || WALLET_MPESA,
  };
}

type RawResult = { ok: boolean; httpStatus: number; json: any; text: string };

async function call(
  path: string,
  init: { method?: string; body?: unknown; idempotencyKey?: string; timeoutMs?: number } = {},
): Promise<RawResult> {
  const { key, merchant } = creds();
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "X-Merchant-Id": merchant,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    signal: AbortSignal.timeout(init.timeoutMs ?? 90_000),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!res.ok) console.log("[zumbopay]", path, "HTTP", res.status, text.slice(0, 500));
  return { ok: res.ok, httpStatus: res.status, json, text };
}

export function normalizePhone(raw: string) {
  let n = String(raw || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("258") && n.length > 9) n = n.slice(3);
  return n;
}

export function toMsisdn(raw: string) {
  return `258${normalizePhone(raw)}`;
}

export function methodFromPhone(_phone: string): NetshopMethod {
  return "mpesa"; // apenas carteira M-Pesa activa
}

export type NetshopChargeInput = {
  amount: number;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  description?: string;
  method?: NetshopMethod;
  currency?: "MZN" | "ZAR";
  metadata?: Record<string, unknown>;
  return_url?: string;
  idempotencyKey?: string;
};

export type NetshopChargeResult = {
  reference: string;
  status: "paid" | "pending" | "failed";
  test_mode: boolean;
  paid: boolean;
  failed_reason?: string;
  response_code?: string;
  checkout_url?: string;
};

export function mapZumboStatus(s: unknown): "paid" | "pending" | "failed" {
  const v = String(s || "pending").toLowerCase();
  if (["success", "succeeded", "paid", "completed"].includes(v)) return "paid";
  if (["failed", "declined", "cancelled", "canceled", "expired", "rejected"].includes(v)) return "failed";
  return "pending";
}

export async function netshopCharge(input: NetshopChargeInput): Promise<NetshopChargeResult> {
  const phone = normalizePhone(input.customer_phone);
  const name = String(input.customer_name || "").trim();
  const amount = Number(input.amount);
  if (!name) throw new Error("Nome do cliente é obrigatório");
  if (!phone || phone.length < 9) throw new Error("Telefone inválido (9 dígitos)");
  if (!/^8[45]/.test(phone)) throw new Error("Use um número M-Pesa (84 ou 85)");
  if (!Number.isFinite(amount) || amount < 1) throw new Error("Valor inválido");

  const { wallet } = creds();
  const idempotencyKey = input.idempotencyKey || crypto.randomUUID();
  const body = {
    wallet_id: wallet,
    amount,
    msisdn: toMsisdn(phone),
    customer_name: name,
    source_id: idempotencyKey,
  };

  let r: RawResult;
  try {
    r = await call("/charges", { method: "POST", body, idempotencyKey });
  } catch (e) {
    console.log("[zumbopay] charge timeout, a repetir com mesma chave", e);
    try {
      r = await call("/charges", { method: "POST", body, idempotencyKey });
    } catch {
      throw new Error("O provedor não respondeu a tempo. Se o pagamento foi debitado será confirmado automaticamente.");
    }
  }

  const data = r.json?.data ?? {};
  const err = r.json?.error;
  const reference = String(data?.reference || "");
  if (!reference) {
    const msg = err?.code === "psp_declined"
      ? (err?.message || "Pagamento recusado pela operadora")
      : (err?.message || `Gateway ${r.httpStatus}`);
    return r.httpStatus === 402
      ? { reference: "", status: "failed", test_mode: false, paid: false, failed_reason: msg, response_code: err?.code }
      : Promise.reject(new Error(msg));
  }

  const status = mapZumboStatus(data?.status);
  return {
    reference,
    status,
    test_mode: false,
    paid: status === "paid",
    failed_reason: status === "failed" ? (data?.message || err?.message) : undefined,
    response_code: data?.code ?? undefined,
  };
}

export async function netshopCheck(reference: string): Promise<"paid" | "pending" | "failed"> {
  try {
    const r = await call(`/payments/${encodeURIComponent(reference)}`, { timeoutMs: 20_000 });
    if (!r.ok) return "pending";
    const d = r.json?.data ?? {};
    return mapZumboStatus(d?.status ?? d?.payment_status);
  } catch (e) {
    console.log("[zumbopay check] error", e);
    return "pending";
  }
}

export async function netshopStatus() {
  const t0 = Date.now();
  const configured = Boolean(process.env.ZUMBOPAY_API_KEY);
  try {
    const r = await call("/merchant/validate", { timeoutMs: 15_000 });
    return { ok: r.ok, configured, latency_ms: Date.now() - t0, message: r.ok ? undefined : `HTTP ${r.httpStatus}` };
  } catch (e) {
    return { ok: false, configured, latency_ms: Date.now() - t0, message: e instanceof Error ? e.message : "erro" };
  }
}
