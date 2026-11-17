import { z } from "zod";

const BASE = "https://connector-gateway.lovable.dev/udc_paynow_pagaja";
export async function paynowRequest(path: string, body?: unknown) {
  const key = process.env.UDC_PAYNOW_PAGAJA_API_KEY;
  const auth = process.env.LOVABLE_API_KEY;
  if (!key || !auth) throw new Error("PayNow não configurada");
  // Charges are NOT idempotent at the provider: never automatically retry POSTs.
  const response = await fetch(BASE + path, { method: body ? "POST" : "GET", headers: {
    Authorization: `Bearer ${auth}`, "X-Connection-Api-Key": key, "Content-Type": "application/json",
  }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`PayNow [${response.status}]: ${response.status === 403 ? "Produção não desbloqueada na conta PayNow" : "Pedido recusado pelo provedor"}`);
  const result = await response.json();
  if (result.success !== true) throw new Error("PayNow não aceitou o pedido");
  return result;
}

const chargeSchema = z.object({
  amount: z.number().finite().min(50).max(1_000_000),
  currency: z.literal("MZN"), payment_method: z.enum(["mpesa", "emola"]),
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email("Informe um email válido para pagar").max(160),
  customer_phone: z.string().regex(/^8[4567]\d{7}$/), description: z.string().max(4000),
});
export async function paynowCharge(input: z.input<typeof chargeSchema>) {
  const payload = chargeSchema.parse(input);
  const result = await paynowRequest("/api/v1/charges", payload);
  const parsed = z.object({ reference: z.string().min(1).max(200), status: z.enum(["pending", "success"]), test_mode: z.boolean().optional(), checkout_url: z.string().url().nullable().optional() }).parse(result.data);
  const test = parsed.test_mode === true || parsed.reference.startsWith("test_");
  // A live immediate-success response still requires the confirmed orders read.
  return { reference: parsed.reference, status: test && parsed.status === "success" ? "paid" as const : "pending" as const,
    test_mode: test, paid: false, gateway: "paynow" as const, checkout_url: parsed.checkout_url ?? undefined };
}

export const orderSchema = z.object({ id: z.string().min(1).max(200), amount: z.number().finite().positive(), currency: z.string().max(3), status: z.literal("paid") });
export function orderMatches(order: z.infer<typeof orderSchema>, tx: { external_ref: string; amount_mzn: number }) {
  return !order.id.startsWith("test_") && order.id === tx.external_ref && order.currency === "MZN" && order.amount === Number(tx.amount_mzn);
}
export async function paynowOrder(reference: string, since?: string) {
  if (!reference || reference.startsWith("test_")) return null;
  let cursor: string | undefined;
  for (let page = 0; page < 20; page++) {
    const query = new URLSearchParams({ limit: "200" });
    if (since) query.set("since", since);
    if (cursor) query.set("cursor", cursor);
    const result = await paynowRequest(`/api/v1/orders?${query}`);
    const list = z.object({ orders: z.array(orderSchema), has_more: z.boolean(), next_cursor: z.string().nullable().optional() }).parse(result);
    const found = list.orders.find(order => order.id === reference);
    if (found) return found;
    if (!list.has_more) return null;
    if (!list.next_cursor || list.next_cursor === cursor) throw new Error("Paginação PayNow inválida");
    cursor = list.next_cursor;
  }
  throw new Error("Confirmação PayNow pendente");
}

export async function settlePaynow(reference: string, eventId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: tx, error } = await supabaseAdmin.from("transactions").select("id,status,metadata,amount_mzn,external_ref,created_at").eq("external_ref", reference).maybeSingle();
  if (error) throw error;
  if (!tx) throw new Error("Referência ainda não registada");
  const metadata = (tx.metadata ?? {}) as Record<string, unknown>;
  if (metadata.gateway !== "paynow" || metadata.test_mode !== false || reference.startsWith("test_")) return "pending" as const;
  if (tx.status === "paid") return "paid" as const;
  if (tx.status !== "pending") return "failed" as const;
  const order = await paynowOrder(reference, new Date(Date.parse(tx.created_at) - 60_000).toISOString());
  if (!order) return "pending" as const;
  if (!orderMatches(order, { external_ref: reference, amount_mzn: Number(tx.amount_mzn) })) throw new Error("Valor ou moeda PayNow não corresponde");
  const { error: updateError } = await supabaseAdmin.from("transactions").update({ metadata: { ...metadata, paynow_verified: true } }).eq("id", tx.id).eq("status", "pending");
  if (updateError) throw updateError;
  const { error: settleError } = await supabaseAdmin.rpc("settle_pagar_payment", { p_transaction_id: tx.id, p_event_id: eventId });
  if (settleError) throw settleError;
  const { notifyNewSale } = await import("@/lib/sale-notify.server");
  await notifyNewSale(supabaseAdmin, tx.id);
  return "paid" as const;
}