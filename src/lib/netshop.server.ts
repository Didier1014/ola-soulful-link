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

type RawResult = { ok: boolean; httpStatus: number; json: any; text: string };

async function call(
  path: string,
  init: { method?: string; body?: unknown; idempotencyKey?: string; timeoutMs?: number } = {},
): Promise<RawResult> {
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
    signal: AbortSignal.timeout(init.timeoutMs ?? 100_000),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!res.ok) console.log("[netshop]", path, "HTTP", res.status, text.slice(0, 500));
  return { ok: res.ok, httpStatus: res.status, json, text };
}

async function callOrThrow(path: string, init: Parameters<typeof call>[1] = {}) {
  const r = await call(path, init);
  if (!r.ok) {
    throw new Error(
      r.json?.failed_reason || r.json?.message || r.json?.error || `Gateway ${r.httpStatus}`,
    );
  }
  return r.json ?? {};
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
  /** Chave de idempotência estável (usar o id da transacção) */
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

// Códigos do provedor que NÃO são terminais: o cliente pode ter sido debitado.
const NON_TERMINAL_CODES = new Set(["INS-9", "TIMEOUT", "processing"]);

function mapStatus(data: any): "paid" | "pending" | "failed" {
  const status = String(data?.status || "pending").toLowerCase();
  const code = String(data?.provider?.responseCode || data?.responseCode || "");
  if (status === "paid") return "paid";
  if (NON_TERMINAL_CODES.has(code)) return "pending";
  if (status === "failed") return "failed";
  return "pending";
}

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

  // Chave estável: permite repetir o POST e recuperar a resposta original em caso de timeout.
  const idempotencyKey = input.idempotencyKey || crypto.randomUUID();

  let r: RawResult;
  try {
    r = await call("/charges", { method: "POST", body, idempotencyKey });
  } catch (e) {
    // Timeout/erro de rede: repetir com a MESMA chave devolve a cobrança já criada.
    console.log("[netshopCharge] primeira tentativa falhou, a recuperar por idempotência", e);
    try {
      r = await call("/charges", { method: "POST", body, idempotencyKey, timeoutMs: 100_000 });
    } catch (e2) {
      throw new Error("O provedor não respondeu a tempo. Se o pagamento foi debitado será confirmado automaticamente.");
    }
  }

  const data = r.json?.data ?? r.json ?? {};
  const reference = String(data?.id || "");
  // Sem referência não há nada a reconciliar → erro real (credenciais, validação, etc.)
  if (!reference) {
    throw new Error(
      data?.failed_reason || data?.message || data?.error || `Gateway ${r.httpStatus}`,
    );
  }

  const status = mapStatus(data);
  return {
    reference,
    status,
    test_mode: Boolean(data?.test_mode),
    paid: status === "paid",
    failed_reason: data?.failed_reason ?? data?.provider?.responseDesc ?? undefined,
    response_code: data?.provider?.responseCode ?? undefined,
    checkout_url: data?.checkout?.hosted_url ?? data?.checkout?.url ?? undefined,
  };
}

// GET /charges/{id} é a fonte de verdade
export async function netshopCheck(reference: string): Promise<"paid" | "pending" | "failed"> {
  try {
    const r = await callOrThrow(`/charges/${encodeURIComponent(reference)}`, { timeoutMs: 20_000 });
    const data = r?.data ?? r;
    return mapStatus(data);
  } catch (e) {
    console.log("[netshopCheck] error", e);
    return "pending";
  }
}

export async function netshopStatus() {
  const t0 = Date.now();
  const configured = Boolean(process.env.NETSHOP_API_KEY && process.env.NETSHOP_WALLET_ID);
  try {
    const r = await callOrThrow("/ping", { timeoutMs: 15_000 });
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
