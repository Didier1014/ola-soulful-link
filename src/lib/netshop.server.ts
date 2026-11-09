// Compatibility adapter: new payments use VendusPay push; legacy Pagar refs (pay_) are still reconciled.
import { pagarPayment, paymentState } from "./pagar.server";
import { vendusPush, vendusStatus, validateVendusCredentials } from "./venduspay.server";
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
  if (!(input.amount >= 10) || input.amount > 1_000_000) throw new Error("Valor mínimo é 10 MT");
  const r = await vendusPush({ amount: input.amount, method, phone });
  return { reference: r.reference, status: r.status, test_mode: false, paid: r.status === "paid",
    gateway: "venduspay", failed_reason: "Pagamento não concluído" };
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
  const key = process.env.VENDUSPAY_API_KEY;
  if (!key) return { ok: false, configured: false, latency_ms: 0, message: "VendusPay não configurada" };
  try {
    const v = await validateVendusCredentials(key, process.env.VENDUSPAY_CLIENT_ID);
    return { ok: v.connected, configured: true, environment: "LIVE", latency_ms: Date.now() - t0, message: v.message };
  } catch { return { ok: false, configured: true, latency_ms: Date.now() - t0, message: "Não foi possível contactar a VendusPay" }; }
}
