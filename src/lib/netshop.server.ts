// Compatibility adapter: all active payment creation uses Pagar direct C2B.
import { pagarRequest, pagarPayment, paymentState } from "./pagar.server";
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
  failed_reason?: string; response_code?: string; checkout_url?: string;
};
export async function netshopCharge(input: NetshopChargeInput): Promise<NetshopChargeResult> {
  const phone = normalizePhone(input.customer_phone);
  const method = input.method ?? methodFromPhone(phone);
  if (!["mpesa", "emola"].includes(method)) throw new Error("A Pagar aceita M-Pesa e e-Mola na API direta");
  if (!/^8[4567]\d{7}$/.test(phone)) throw new Error("Introduza um número M-Pesa ou e-Mola válido (9 dígitos)");
  if (!Number.isInteger(input.amount) || input.amount < 20 || input.amount > 40000) throw new Error("A Pagar aceita valores inteiros de 20 a 40.000 MT");
  const reference = input.idempotencyKey || crypto.randomUUID();
  const data = await pagarRequest("/payments", {
    reference, title: (input.description || "Pagamento Redox Pay").slice(0, 120),
    description: input.description || "Pagamento Redox Pay", amountMzn: input.amount,
    method: method.toUpperCase(), payerPhone: phone,
  }, `payment:${reference}`);
  const payment = data.payment;
  if (!payment?.id || !["TEST", "LIVE"].includes(payment.environment)) throw new Error("Resposta inválida da Pagar");
  const state = paymentState(payment);
  return { reference: payment.id, status: state.status, test_mode: state.test_mode, paid: state.canCredit,
    failed_reason: payment.safeMessage || "Pagamento não concluído" };
}
export async function netshopCheck(reference: string): Promise<"paid" | "pending" | "failed"> {
  if (!reference.startsWith("pay_")) return "pending";
  try {
    const state = paymentState(await pagarPayment(reference));
    return state.test_mode ? (state.status === "pending" ? "pending" : "failed") : state.status;
  } catch { return "pending"; }
}
export async function netshopStatus() {
  const t0 = Date.now();
  const configured = Boolean(process.env.PAGAR_API_KEY && process.env.PAGAR_SIGNING_SECRET);
  try {
    const { wallet } = await pagarRequest("/wallet");
    return { ok: true, configured, environment: wallet?.environment, latency_ms: Date.now() - t0 };
  } catch { return { ok: false, configured, latency_ms: Date.now() - t0, message: "Não foi possível contactar a Pagar" }; }
}
