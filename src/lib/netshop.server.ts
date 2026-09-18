// NetShop Gateway — https://www.netshop.co.mz/api/v1
// Auth: Authorization: Bearer ns_live_sk_... + X-Wallet-ID
// Endpoints usados: /ping, /charges, /charges/{id}

const BASE = "https://www.netshop.co.mz/api/v1";

export type NetshopMethod = "mpesa" | "emola" | "mkesh" | "card";

function creds() {
  const key = process.env.NETSHOP_API_KEY;
  const wallet = process.env.NETSHOP_WALLET_ID;
  if (!key || !wallet) throw new Error("Credenciais NetShop não configuradas");
  return { key, wallet };
}

async function call(
  path: string,
  init: { method?: string; body?: unknown; idempotencyKey?: string } = {},
) {
  const { key, wallet } = creds();
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "X-Wallet-ID": wallet,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!res.ok) {
    console.log("[netshop]", path, "HTTP", res.status, text);
    throw new Error(json?.failed_reason || json?.message || json?.error || `Gateway ${res.status}`);
  }
  return json ?? {};
}

// NetShop aceita MSISDN em formato +258XXXXXXXXX
export function normalizePhone(raw: string) {
  let n = String(raw || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("258") && n.length > 9) n = n.slice(3);
  return n;
}

export function toMsisdn(raw: string) {
  return `+258${normalizePhone(raw)}`;
}

export function methodFromPhone(_phone: string): NetshopMethod {
  return "mpesa"; // apenas M-Pesa activo nesta conta
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
};

export type NetshopChargeResult = {
  reference: string;
  status: string;
  test_mode: boolean;
  paid: boolean;
  checkout_url?: string;
};

export async function netshopCharge(input: NetshopChargeInput): Promise<NetshopChargeResult> {
  const phone = normalizePhone(input.customer_phone);
  const name = String(input.customer_name || "").trim();
  const amount = Number(input.amount);
  const method = input.method ?? "mpesa";
  if (!name) throw new Error("Nome do cliente é obrigatório");
  if (method !== "card" && (!phone || phone.length < 9)) throw new Error("Telefone inválido (9 dígitos)");
  if (!Number.isFinite(amount) || amount < 10) throw new Error("Valor mínimo: 10 MT");

  const body: Record<string, unknown> = {
    amount,
    currency: input.currency ?? "MZN",
    method,
    reference: input.description || "Pagamento",
    metadata: { customer_name: name, ...(input.metadata ?? {}) },
  };
  if (method !== "card") body.msisdn = toMsisdn(phone);
  if (input.customer_email) body.customer_email = input.customer_email;
  if (input.return_url) body.return_url = input.return_url;

  const r = await call("/charges", {
    method: "POST",
    body,
    idempotencyKey: crypto.randomUUID(),
  });
  const data = r?.data ?? r;
  const reference = String(data?.id || "");
  if (!reference) throw new Error("Gateway não devolveu referência");
  const status = String(data?.status || "pending").toLowerCase();

  return {
    reference,
    status,
    test_mode: false,
    paid: status === "paid",
    checkout_url: data?.checkout?.hosted_url ?? undefined,
  };
}

// GET /charges/{id} é a fonte de verdade
export async function netshopCheck(reference: string): Promise<"paid" | "pending" | "failed"> {
  try {
    const r = await call(`/charges/${encodeURIComponent(reference)}`);
    const data = r?.data ?? r;
    const status = String(data?.status || "").toLowerCase();
    if (status === "paid") return "paid";
    if (status === "failed") return "failed";
  } catch (e) {
    console.log("[netshopCheck] error", e);
  }
  return "pending";
}

export async function netshopStatus() {
  const t0 = Date.now();
  const configured = Boolean(process.env.NETSHOP_API_KEY && process.env.NETSHOP_WALLET_ID);
  try {
    const r = await call("/ping");
    return { ok: Boolean(r?.ok), configured, latency_ms: Date.now() - t0 };
  } catch (e) {
    return {
      ok: false,
      configured,
      latency_ms: Date.now() - t0,
      message: e instanceof Error ? e.message : "erro",
    };
  }
}
