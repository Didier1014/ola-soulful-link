// Compatibility adapter: new payments use Pagar; pending VendusPay references remain reconcilable.
import { pagarPayment, pagarRequest, paymentState } from "./pagar.server";
import { vendusStatus } from "./venduspay.server";
export type NetshopMethod = "mpesa" | "emola" | "mkesh" | "card";
export function normalizePhone(raw: string) {
  let n = String(raw || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("258") && n.length > 9) n = n.slice(3);
  return n;
}
export function toMsisdn(raw: string) { return `258${normalizePhone(raw)}`; }
export function methodFromPhone(phone: string): NetshopMethod { return /^8[67]/.test(normalizePhone(phone)) ? "emola" : "mpesa"; }
export type NetshopChargeInput = {
  amount: number; customer_name: string; customer_email?: string; customer_phone: string;
  description?: string; method?: NetshopMethod; currency?: "MZN" | "ZAR";
  metadata?: Record<string, unknown>; return_url?: string; idempotencyKey?: string;
};
export type NetshopChargeResult = {
  reference: string; status: "paid" | "pending" | "failed"; test_mode: boolean; paid: boolean;
  failed_reason?: string; response_code?: string; checkout_url?: string; gateway?: "venduspay" | "pagar";
};
export async function netshopCharge(input: NetshopChargeInput): Promise<NetshopChargeResult> {
  const phone = normalizePhone(input.customer_phone);
  const method = input.method ?? methodFromPhone(phone);
  if (method !== "mpesa" && method !== "emola") throw new Error("Pagamentos aceites: M-Pesa e e-Mola");
  if (method === "mpesa" && !/^8[45]\d{7}$/.test(phone)) throw new Error("Para M-Pesa use um número 84 ou 85 (9 dígitos)");
  if (method === "emola" && !/^8[67]\d{7}$/.test(phone)) throw new Error("Para e-Mola use um número 86 ou 87 (9 dígitos)");
  if (!Number.isInteger(input.amount) || input.amount < 20 || input.amount > 40_000) throw new Error("A Pagar aceita valores inteiros entre 20 e 40 000 MT");
  if (input.currency && input.currency !== "MZN") throw new Error("A Pagar aceita pagamentos em MZN");
  const operationKey = input.idempotencyKey || crypto.randomUUID();
  const result = await pagarRequest("/payments", {
    reference: operationKey,
    title: input.description || "Pagamento RedoxPay",
    description: input.description || "Pagamento RedoxPay",
    amountMzn: input.amount,
    method: method.toUpperCase(),
    payerPhone: phone,
  }, operationKey);
  const payment = result.payment;
  if (!payment?.id || !/^pay_[A-Za-z0-9_-]+$/.test(payment.id) || !["LIVE", "TEST"].includes(payment.environment) || Number(payment.amountMzn) !== input.amount || typeof payment.status !== "string") throw new Error("Resposta inválida da Pagar");
  const state = paymentState(payment);
  return { reference: payment.id, status: state.status, test_mode: state.test_mode, paid: state.canCredit,
    gateway: "pagar", failed_reason: payment.safeMessage || "Pagamento não concluído" };
}
export async function netshopCheck(reference: string): Promise<"paid" | "pending" | "failed"> {
  try {
    if (reference.startsWith("pay_")) {
      const state = paymentState(await pagarPayment(reference));
      return state.test_mode ? (state.status === "pending" ? "pending" : "failed") : state.status;
    }
    return await vendusStatus(reference);
  } catch { return "pending"; }
}
export async function netshopStatus() {
  const t0 = Date.now();
  const key = process.env.PAGAR_API_KEY;
  const secret = process.env.PAGAR_SIGNING_SECRET;
  if (!key || !secret) return { ok: false, configured: false, latency_ms: 0, message: "Pagar não configurada" };
  try {
    const wallet = await pagarRequest("/wallet");
    return { ok: true, configured: true, environment: wallet.environment ?? wallet.wallet?.environment, latency_ms: Date.now() - t0, message: "Pagar ligada" };
  } catch { return { ok: false, configured: true, latency_ms: Date.now() - t0, message: "Não foi possível contactar a Pagar" }; }
}
