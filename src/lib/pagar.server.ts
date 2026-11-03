import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE = "https://api.pagar.co.mz/api/v1";
export type PagarPayment = { id: string; status: string; environment: string; amountMzn: number; reference: string; method: string; safeMessage?: string; failureReason?: string };

export function signedHeaders(path: string, raw: string, key: string, secret: string, idempotencyKey: string) {
  const timestamp = Date.now().toString();
  const nonce = randomBytes(18).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  const canonical = [timestamp, nonce, "POST", new URL(BASE + path).pathname, hash].join("\n");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey,
    "X-Pagar-Timestamp": timestamp, "X-Pagar-Nonce": nonce, "X-Pagar-Signature": `v1=${createHmac("sha256", secret).update(canonical).digest("hex")}` };
}

export async function pagarRequest(path: string, body?: unknown, idempotencyKey?: string) {
  const key = process.env.PAGAR_API_KEY;
  const secret = process.env.PAGAR_SIGNING_SECRET;
  if (!key || (body && !secret)) throw new Error("Credenciais Pagar não configuradas");
  const raw = body ? JSON.stringify(body) : undefined;
  const operationKey = idempotencyKey || crypto.randomUUID();
  const headers = raw && secret ? signedHeaders(path, raw, key, secret, operationKey) : { Authorization: `Bearer ${key}` };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(BASE + path, { method: raw ? "POST" : "GET", headers: attempt && raw && secret ? signedHeaders(path, raw, key, secret, operationKey) : headers, body: raw, signal: AbortSignal.timeout(25_000) });
      const data = await response.json();
      if (!response.ok) {
        console.log("[pagar] rejected", response.status, data.error, data.requestId);
        if (response.status >= 500 && attempt === 0) continue;
        throw new Error(response.status === 401 || response.status === 403 ? "A Pagar não autorizou o pagamento. Verifique a configuração da app." : "A Pagar não aceitou o pedido de pagamento.");
      }
      return data;
    } catch (error) {
      if (attempt === 0 && !(error instanceof Error && error.message.startsWith("A Pagar"))) continue;
      throw error;
    }
  }
  throw new Error("Pagar indisponível. Tente novamente mais tarde.");
}

export function paymentState(payment: Pick<PagarPayment, "status" | "environment">) {
  const status = payment.status.toUpperCase();
  return { status: status === "PAID" ? "paid" as const : ["FAILED", "CANCELLED"].includes(status) ? "failed" as const : "pending" as const,
    test_mode: payment.environment === "TEST", canCredit: status === "PAID" && payment.environment === "LIVE" };
}

export async function pagarPayment(id: string): Promise<PagarPayment> {
  if (!/^pay_[A-Za-z0-9_-]+$/.test(id)) throw new Error("Referência não pertence à Pagar");
  const data = await pagarRequest(`/payments/${encodeURIComponent(id)}`);
  if (!data.payment?.id || !data.payment?.environment) throw new Error("Resposta inválida da Pagar");
  return data.payment;
}

export function validWebhook(raw: string, header: string, secret: string, now = Date.now()) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=")));
  if (!/^\d+$/.test(parts.t || "") || !/^[a-f0-9]{64}$/.test(parts.v1 || "")) return false;
  if (Math.abs(now / 1000 - Number(parts.t)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest();
  return timingSafeEqual(Buffer.from(parts.v1, "hex"), expected);
}