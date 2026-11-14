import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { internationalAmounts, verifiedInternationalState } from "./checkout-currency";

export const initializeInternationalCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ product_id: z.string().uuid(), name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(160), phone: z.string().trim().max(15).regex(/^[+\d ()-]*$/).optional(), operation_session_id: z.string().uuid().optional(), operation_token: z.string().regex(/^[a-f0-9]{64}$/).optional() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { paystackRequest, capabilityHash } = await import("./paystack.server");
    const { data: product, error } = await supabaseAdmin.from("products").select("id,user_id,checkout_provider,currency,price_amount,active,approval_status").eq("id", data.product_id).maybeSingle();
    if (error || !product || !product.active || product.approval_status !== "approved") throw new Error("Produto indisponível");
    if (product.checkout_provider !== "paystack" || product.currency !== "ZAR") throw new Error("Este método de pagamento não está disponível");
    const amounts = internationalAmounts(Number(product.price_amount));
    const reference = `rdx-${crypto.randomUUID()}`;
    const capability = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    let checkoutSessionId: string | null = null;
    if (data.operation_session_id && data.operation_token) {
      const { data: session } = await supabaseAdmin.from("checkout_sessions").select("id").eq("id", data.operation_session_id).eq("user_id", product.user_id).eq("product_id", product.id).eq("token_hash", await capabilityHash(data.operation_token)).maybeSingle();
      checkoutSessionId = session?.id ?? null;
    }
    const { error: insertError } = await supabaseAdmin.from("international_payments").insert({ user_id: product.user_id, product_id: product.id, reference, capability_hash: await capabilityHash(capability), currency: "ZAR", amount_minor: amounts.amount_minor, fee_minor: amounts.fee_minor, customer_name: data.name, customer_email: data.email, checkout_session_id: checkoutSessionId });
    if (insertError) throw new Error(insertError.message);
    const origin = new URL(getRequest().url).origin;
    let initialized;
    try {
      initialized = await paystackRequest("/transaction/initialize", { email: data.email, amount: String(amounts.amount_minor), currency: "ZAR", reference, callback_url: `${origin}/international-return`, metadata: { product_id: product.id, customer_name: data.name, ...(data.phone ? { customer_phone: data.phone } : {}) }, channels: ["card", "eft", "capitec_pay"] });
      const url = new URL(initialized.authorization_url);
      if (url.protocol !== "https:" || !["checkout.paystack.com", "paystack.com"].includes(url.hostname)) throw new Error("Endereço de pagamento inválido");
    } catch (e) {
      await supabaseAdmin.from("international_payments").update({ status: "failed" }).eq("reference", reference);
      throw e;
    }
    const { error: updateError } = await supabaseAdmin.from("international_payments").update({ authorization_url: initialized.authorization_url }).eq("reference", reference);
    if (updateError) throw new Error(updateError.message);
    return { reference, capability, access_code: String(initialized.access_code), authorization_url: String(initialized.authorization_url) };
  });

export const checkInternationalCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ reference: z.string().regex(/^rdx-[a-f0-9-]{36}$/), capability: z.string().min(72).max(72) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { paystackRequest, capabilityHash } = await import("./paystack.server");
    const { data: payment, error } = await supabaseAdmin.from("international_payments").select("reference,amount_minor,currency,status,product_id").eq("reference", data.reference).eq("capability_hash", await capabilityHash(data.capability)).maybeSingle();
    if (error || !payment) throw new Error("Sessão de pagamento inválida");
    let status = payment.status;
    if (status !== "paid" && status !== "test_paid") {
      const verified = await paystackRequest(`/transaction/verify/${encodeURIComponent(payment.reference)}`);
      status = verifiedInternationalState(payment, verified);
      const { error: updateError } = await supabaseAdmin.from("international_payments").update({ status, ...(status === "paid" ? { paid_at: new Date().toISOString() } : {}) }).eq("reference", payment.reference).not("status", "in", "(paid,test_paid)");
      if (updateError) throw new Error(updateError.message);
    }
    if (status !== "paid") return { status, delivery_url: null };
    try {
      const { notifyInternationalSale } = await import('./international-sale.server');
      await notifyInternationalSale(supabaseAdmin, payment.reference);
    } catch { console.error('[international-sale] notification failed'); }
    try {
      const { sendPurchaseEmails } = await import('./purchase-email.server');
      await sendPurchaseEmails(supabaseAdmin, 'international', payment.reference);
    } catch { console.error('[email:international] purchase notification failed'); }
    const { data: product } = await supabaseAdmin.from("products").select("delivery_url,thank_you_url,product_type,digital_file_path").eq("id", payment.product_id).maybeSingle();
    let delivery = product?.thank_you_url || product?.delivery_url || null;
    if (product?.product_type === "digital" && product.digital_file_path) {
      const { data: signed } = await supabaseAdmin.storage.from("product-digital").createSignedUrl(product.digital_file_path, 3600, { download: true });
      delivery = signed?.signedUrl ?? delivery;
    }
    return { status, delivery_url: delivery };
  });

export const listInternationalPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("international_payments").select("reference,currency,amount_minor,fee_minor,status,created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });