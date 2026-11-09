import { createHmac, timingSafeEqual } from "node:crypto";

const BASE = "https://game.makavisual.online/api/api/v1";

export type VendusValidation = { connected: boolean; status: number; message: string };

/** Rule: 401/403 = invalid credentials; any other HTTP status = valid. Never logs or returns the key. */
export function classifyVendusStatus(status: number, message: string): VendusValidation {
  if (status === 401 || status === 403) {
    return { connected: false, status, message: message || "Credenciais inválidas" };
  }
  return { connected: true, status, message: "VendusPay ligada" };
}

function headers(apiKey: string, clientId?: string) {
  const h: Record<string, string> = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  if (clientId && clientId.trim()) h["X-Client-Id"] = clientId.trim();
  return h;
}

function credentials() {
  const key = process.env["VENDUSPAY_API_KEY"];
  if (!key) throw new Error("VendusPay não configurada");
  return { key, clientId: process.env["VENDUSPAY_CLIENT_ID"] };
}

async function readMessage(res: Response, apiKey: string) {
  try {
    const body: any = await res.json();
    const raw = body?.errors ? Object.values(body.errors).join(" ") : body?.error ?? body?.message ?? "";
    return { body, message: String(typeof raw === "object" ? JSON.stringify(raw) : raw).split(apiKey).join("***") };
  } catch {
    return { body: null, message: "" };
  }
}

export async function validateVendusCredentials(apiKey: string, clientId?: string): Promise<VendusValidation> {
  const url = `${BASE}/payments/status?partner_transaction_id=VALIDACAO000&payment_type=push`;
  const res = await fetch(url, { headers: headers(apiKey, clientId) });
  const { message } = await readMessage(res, apiKey);
  return classifyVendusStatus(res.status, message);
}

/** Maps VendusPay states to RedoxPay states. Only SUCCESS is paid. */
export function vendusState(status: string | undefined | null): "paid" | "pending" | "failed" {
  const s = String(status || "").toUpperCase();
  if (s === "SUCCESS") return "paid";
  if (s === "FAILED" || s === "EXPIRED" || s === "CANCELLED") return "failed";
  return "pending";
}

export async function vendusPush(input: { amount: number; method: "mpesa" | "emola"; phone: string }) {
  const { key, clientId } = credentials();
  const res = await fetch(`${BASE}/payments`, {
    method: "POST",
    headers: headers(key, clientId),
    body: JSON.stringify({
      amount: String(input.amount), payment_method: input.method, payment_type: "push",
      transaction_type: "C2B", client_account_number: input.phone,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const { body, message } = await readMessage(res, key);
  const ref = body?.data?.partner_transaction_id;
  if (!res.ok || !ref) {
    console.log("[venduspay] rejected", res.status, message);
    throw new Error(message ? `VendusPay: ${message}` : "A VendusPay não aceitou o pedido de pagamento.");
  }
  return { reference: String(ref), operatorId: body.data.transaction_id ? String(body.data.transaction_id) : undefined, status: vendusState(body.data.status) };
}

export async function vendusStatus(reference: string): Promise<"paid" | "pending" | "failed"> {
  const { key, clientId } = credentials();
  const url = `${BASE}/payments/status?partner_transaction_id=${encodeURIComponent(reference)}&payment_type=push`;
  const res = await fetch(url, { headers: headers(key, clientId), signal: AbortSignal.timeout(15_000) });
  const { body } = await readMessage(res, key);
  if (!res.ok) return "pending";
  return vendusState(body?.data?.status);
}

/** Webhook signature: sha256=HMAC(secret, `${timestamp}.${raw}`), 5-minute window. */
export function validVendusWebhook(raw: string, timestamp: string, signature: string, secret: string, now = Date.now()) {
  if (!/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const hex = signature.replace(/^sha256=/, "");
  if (!/^[a-f0-9]{64}$/.test(hex)) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest();
  return timingSafeEqual(Buffer.from(hex, "hex"), expected);
}
