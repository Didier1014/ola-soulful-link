// Gateway VPay — https://api.vpay.co.mz
// Auth: POST /v1/auth/token {client_id, client_secret} -> Bearer (1h)
// Pedido: POST /v1/orders -> { orderId, checkout } (cliente paga M-Pesa/e-Mola na página VPay)
// Estado: GET /v1/orders/{id}/status
// (Nome do ficheiro mantido para não mexer nos imports existentes.)

const BASE = "https://api.vpay.co.mz";

export type NetshopMethod = "mpesa" | "emola" | "mkesh" | "card";

let tokenCache: { token: string; exp: number } | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;
  const client_id = process.env.VPAY_CLIENT_ID;
  const client_secret = process.env.VPAY_CLIENT_SECRET;
  if (!client_id || !client_secret) throw new Error("Credenciais VPay não configuradas");
  const res = await fetch(`${BASE}/v1/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id, client_secret }),
    signal: AbortSignal.timeout(20_000),
  });
  const j: any = await res.json().catch(() => null);
  const token = j?.data?.access_token;
  if (!res.ok || !token) {
    console.log("[vpay] auth failed", res.status, JSON.stringify(j)?.slice(0, 300));
    throw new Error("Falha na autenticação com o gateway");
  }
  tokenCache = { token, exp: Date.now() + Number(j?.data?.expires_in ?? 3600) * 1000 };
  return token;
}

async function call(path: string, init: { method?: string; body?: unknown; timeoutMs?: number } = {}) {
  const doFetch = async () => {
    const token = await getToken();
    return fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      signal: AbortSignal.timeout(init.timeoutMs ?? 30_000),
    });
  };
  let res = await doFetch();
  if (res.status === 401) { tokenCache = null; res = await doFetch(); }
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!res.ok) console.log("[vpay]", path, "HTTP", res.status, text.slice(0, 500));
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

export function methodFromPhone(phone: string): NetshopMethod {
  return /^8[67]/.test(normalizePhone(phone)) ? "emola" : "mpesa";
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
  if (["success", "succeeded", "paid", "completed", "approved"].includes(v)) return "paid";
  if (["failed", "declined", "cancelled", "canceled", "expired", "rejected", "refunded"].includes(v)) return "failed";
  return "pending";
}

export async function netshopCharge(input: NetshopChargeInput): Promise<NetshopChargeResult> {
  const phone = normalizePhone(input.customer_phone);
  const name = String(input.customer_name || "").trim();
  const amount = Number(input.amount);
  if (!name) throw new Error("Nome do cliente é obrigatório");
  if (!phone || phone.length < 9) throw new Error("Telefone inválido (9 dígitos)");
  if (!Number.isFinite(amount) || amount < 1) throw new Error("Valor inválido");

  const ref = input.idempotencyKey || crypto.randomUUID();
  const email = input.customer_email && input.customer_email.includes("@")
    ? input.customer_email
    : `cliente${phone}@redoxpay.site`;
  const body = {
    source: { source: "api" },
    customer: { merchantCustomerId: ref, name, email, phone: `+258${phone}` },
    shippingAddressDisabled: true,
    deliveryInfoDisabled: true,
    items: [{
      originProductId: `redox-${ref}`,
      name: (input.description || "Pagamento").slice(0, 120),
      quantity: 1,
      price: amount,
    }],
  };

  const r = await call("/v1/orders", { method: "POST", body });
  const orderId = String(r.json?.orderId || r.json?.data?.orderId || "");
  if (!orderId) throw new Error(r.json?.message || r.json?.error || `Gateway ${r.httpStatus}`);
  const status = mapZumboStatus(r.json?.data?.status);
  return {
    reference: orderId,
    status,
    test_mode: false,
    paid: status === "paid",
    checkout_url: r.json?.checkout || `https://checkout.vpay.co.mz/${orderId}`,
  };
}

export async function netshopCheck(reference: string): Promise<"paid" | "pending" | "failed"> {
  try {
    const r = await call(`/v1/orders/${encodeURIComponent(reference)}/status`, { timeoutMs: 20_000 });
    if (!r.ok) return "pending";
    return mapZumboStatus(r.json?.data?.status);
  } catch (e) {
    console.log("[vpay check] error", e);
    return "pending";
  }
}

export async function netshopStatus() {
  const t0 = Date.now();
  const configured = Boolean(process.env.VPAY_CLIENT_ID && process.env.VPAY_CLIENT_SECRET);
  try {
    tokenCache = null;
    await getToken();
    return { ok: true, configured, latency_ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, configured, latency_ms: Date.now() - t0, message: e instanceof Error ? e.message : "erro" };
  }
}
