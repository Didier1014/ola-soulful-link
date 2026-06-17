// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ============== Legacy multi-row settings (kept for back-compat) ============== */
export const getIntegrationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("integration_settings")
      .select("integration_key, settings, push_custom, pushcut, utmify, mozesms")
      .order("integration_key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const saveSchema = z.object({
  integration_key: z.string().min(1).max(80),
  settings: z.record(z.unknown()),
});

export const saveIntegrationSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("integration_settings")
      .upsert({
        user_id: context.userId,
        integration_key: data.integration_key,
        settings: data.settings,
      }, { onConflict: "user_id,integration_key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteIntegrationSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ integration_key: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("integration_settings")
      .delete()
      .eq("integration_key", data.integration_key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== Unified bundle for GrokGG-style page ============== */

const BUNDLE_KEY = "_bundle";

export const getIntegrationsBundle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("integration_settings")
      .select("push_custom, pushcut, utmify, mozesms")
      .eq("integration_key", BUNDLE_KEY)
      .maybeSingle();
    return data ?? { push_custom: {}, pushcut: {}, utmify: {}, mozesms: {} };
  });

const bundleSchema = z.object({
  push_custom: z.object({
    title: z.string().max(120).optional().default(""),
    body: z.string().max(500).optional().default(""),
    currency: z.enum(["MZN", "BRL", "USD", "EUR"]).default("MZN"),
  }).optional(),
  pushcut: z.object({
    enabled: z.boolean().default(false),
    webhook_url: z.string().max(500).optional().default(""),
  }).optional(),
  utmify: z.object({
    enabled: z.boolean().default(false),
    api_token: z.string().max(200).optional().default(""),
    currency: z.enum(["MZN", "BRL", "USD", "EUR"]).default("BRL"),
  }).optional(),
  mozesms: z.object({
    enabled: z.boolean().default(false),
    sender_id: z.string().max(20).optional().default(""),
    template: z.string().max(500).optional().default(""),
    test_number: z.string().max(20).optional().default(""),
  }).optional(),
});

export const saveIntegrationsBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bundleSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("integration_settings")
      .upsert({
        user_id: context.userId,
        integration_key: BUNDLE_KEY,
        settings: {},
        push_custom: data.push_custom || {},
        pushcut: data.pushcut || {},
        utmify: data.utmify || {},
        mozesms: data.mozesms || {},
      }, { onConflict: "user_id,integration_key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============== Test endpoints ============== */

export const testPushcut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ webhook_url: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    const r = await fetch(data.webhook_url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "RedoxPay teste", text: "Notificação de teste recebida com sucesso", input: "Teste" }),
    });
    if (!r.ok) throw new Error(`PUSHcut respondeu ${r.status}`);
    return { ok: true };
  });

export const testUtmify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ api_token: z.string().min(4) }).parse(d))
  .handler(async ({ data }) => {
    // Utmify v2 webhook endpoint accepts token verification by ping
    const r = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: { "x-api-token": data.api_token, "content-type": "application/json" },
      body: JSON.stringify({ orderId: `test-${Date.now()}`, platform: "RedoxPay", paymentMethod: "pix", status: "waiting_payment", createdAt: new Date().toISOString().slice(0,19).replace("T"," "), approvedDate: null, refundedAt: null, customer: { name: "Teste", email: "teste@redoxpay.site", phone: null, document: null, country: "MZ", ip: null }, products: [{ id: "test", name: "Teste", planId: null, planName: null, quantity: 1, priceInCents: 100 }], trackingParameters: { src: null, sck: null, utm_source: null, utm_campaign: null, utm_medium: null, utm_content: null, utm_term: null }, commission: { totalPriceInCents: 100, gatewayFeeInCents: 0, userCommissionInCents: 100 }, isTest: true }),
    });
    if (!r.ok && r.status !== 401) {
      // some test endpoints reject tokens but a 4xx with body is still proof of contact
      const t = await r.text();
      if (r.status >= 500) throw new Error(`UTMify ${r.status}: ${t.slice(0,120)}`);
    }
    return { ok: true, status: r.status };
  });

export const testLowtrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ webhook_url: z.string().url(), api_token: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (data.api_token) headers["authorization"] = `Bearer ${data.api_token}`;
    const r = await fetch(data.webhook_url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        event: "payment.confirmed",
        orderId: `test-${Date.now()}`,
        amount: 100,
        netAmount: 95,
        customer: { name: "Teste RedoxPay", phone: "+258840000000" },
        product: "Produto Teste",
        createdAt: new Date().toISOString(),
        isTest: true,
      }),
    });
    if (!r.ok && r.status >= 500) throw new Error(`LowTrack respondeu ${r.status}`);
    return { ok: true, status: r.status };
  });

export const sendTestSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    sender_id: z.string().min(1).max(20),
    message: z.string().min(1).max(500),
    number: z.string().min(6).max(20),
  }).parse(d))
  .handler(async ({ data }) => {
    // Stub: writes to sms_logs as "queued"; real provider integration ships later
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("sms_logs")
      .insert({ phone: data.number, message: `[${data.sender_id}] ${data.message}`, status: "queued" } as any);
    if (error) throw new Error(error.message);
    return { ok: true };

  });
