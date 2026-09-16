// PagNow / Pagaja gateway client — https://pagaja.site/api/v1
// Auth: OAuth2 client credentials -> Bearer access token
// Endpoints usados: /oauth/token, /charges, /orders, /webhooks

const BASE = "https://pagaja.site/api/v1";

let cachedToken: { value: string; expiresAt: number } | null = null;

export type PagajaMethod = "mpesa" | "emola" | "mksesh" | "visa_mastercard";

export async function pagajaToken(): Promise<string> {
  const direct = process.env.PAGGUE_ACCESS_TOKEN;
  if (direct) return direct;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;

  const client_id = process.env.PAGGUE_CLIENT_ID;
  const client_secret = process.env.PAGGUE_CLIENT_SECRET;
  if (!client_id || !client_secret) throw new Error("Credenciais Pagaja não configuradas");

  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id, client_secret }),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!res.ok || !json?.access_token) {
    console.log("[pagaja] token error", res.status, text);
    throw new Error("Falha na autenticação com o gateway");
  }
  const ttl = Number(json.expires_in ?? 3600) * 1000;
  cachedToken = { value: String(json.access_token), expiresAt: Date.now() + Math.min(ttl, 86_400_000) };
  return cachedToken.value;
}

async function call(path: string, init: { method?: string; body?: unknown } = {}) {
  const token = await pagajaToken();
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!res.ok || json?.success === false) {
    console.log("[pagaja]", path, "HTTP", res.status, text);
    throw new Error(json?.message || json?.error || `Gateway ${res.status}`);
  }
  return json ?? {};
}

// Pagaja aceita 84/85/86/87xxxxxxx (9 dígitos locais)
export function normalizePhone(raw: string) {
  let n = String(raw || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("258") && n.length > 9) n = n.slice(3);
  return n;
}

export function methodFromPhone(phone: string): PagajaMethod {
  const p2 = normalizePhone(phone).slice(0, 2);
  return "mpesa"; // o provedor só suporta M-Pesa nesta conta
}

export type PagajaChargeInput = {
  amount: number;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  description?: string;
  method?: PagajaMethod;
  currency?: "MZN" | "ZAR";
};

export type PagajaChargeResult = {
  reference: string;
  status: string;
  test_mode: boolean;
  paid: boolean;
};

export async function pagajaCharge(input: PagajaChargeInput): Promise<PagajaChargeResult> {
  const phone = normalizePhone(input.customer_phone);
  const name = String(input.customer_name || "").trim();
  const amount = Number(input.amount);
  if (!name) throw new Error("Nome do cliente é obrigatório");
  if (!phone || phone.length < 9) throw new Error("Telefone inválido (9 dígitos)");
  if (!Number.isFinite(amount) || amount < 50) throw new Error("Valor mínimo: 50 MT");

  const body = {
    amount,
    currency: input.currency ?? "MZN",
    description: input.description ?? "",
    customer_name: name,
    // O gateway exige email; usamos um placeholder estável quando não houver.
    customer_email: input.customer_email?.trim() || `${phone}@cliente.redoxpay.site`,
    customer_phone: phone,
    payment_method: input.method ?? methodFromPhone(phone),
  };

  const r = await call("/charges", { method: "POST", body });
  const data = r?.data ?? r;
  const reference = String(data?.reference || data?.id || "");
  if (!reference) throw new Error("Gateway não devolveu referência");
  const status = String(data?.status || "pending").toLowerCase();
  const test_mode = Boolean(data?.test_mode) || reference.startsWith("test_");

  // Em modo de teste o provedor não envia o pedido de pagamento para o telefone
  // do cliente e devolve "success" imediatamente. Nunca tratar como venda real.
  if (test_mode) {
    console.log("[pagaja] charge em TEST MODE — credenciais de teste em uso", reference);
    throw new Error(
      "Gateway em modo de teste: o pedido de pagamento não é enviado ao cliente. É necessário configurar credenciais LIVE do provedor.",
    );
  }

  return {
    reference,
    status,
    test_mode,
    paid: status === "success" || status === "paid" || status === "completed",
  };
}


// A API não tem GET /charges/{id}; o estado confirma-se via webhook
// ou procurando a venda em GET /orders (lista de vendas pagas).
export async function pagajaCheck(reference: string): Promise<"paid" | "pending"> {
  try {
    const r = await call(`/orders?limit=200`);
    const orders: any[] = Array.isArray(r?.orders) ? r.orders : [];
    const found = orders.find((o) => String(o?.id) === String(reference));
    if (found && String(found.status).toLowerCase() === "paid") return "paid";
  } catch (e) {
    console.log("[pagajaCheck] error", e);
  }
  return "pending";
}

export async function pagajaStatus() {
  const t0 = Date.now();
  const configured = Boolean(
    process.env.PAGGUE_ACCESS_TOKEN || (process.env.PAGGUE_CLIENT_ID && process.env.PAGGUE_CLIENT_SECRET),
  );
  try {
    await call("/orders?limit=1");
    return { ok: true, configured, latency_ms: Date.now() - t0 };
  } catch (e) {
    return {
      ok: false,
      configured,
      latency_ms: Date.now() - t0,
      message: e instanceof Error ? e.message : "erro",
    };
  }
}

export async function pagajaSetWebhook(url: string) {
  return call("/webhooks", { method: "POST", body: { url, events: ["payment.completed"] } });
}
