import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { funnelConfigSchema, type FunnelReport } from "./funnel";

export const listFunnels = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("operation_funnels").select("*").eq("user_id", context.userId).order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os funis."); return data;
});
export const saveFunnel = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => funnelConfigSchema.extend({ id: z.string().uuid().optional(), active: z.boolean().default(true) }).parse(v)).handler(async ({ data, context }) => {
  const { id, ...config } = data;
  const query = id ? context.supabase.from("operation_funnels").update(config).eq("id", id).eq("user_id", context.userId) : context.supabase.from("operation_funnels").insert({ ...config, user_id: context.userId });
  const { data: result, error } = await query.select("*").single();
  if (error) throw new Error("Não foi possível guardar o funil."); return result;
});
export const getFunnelReport = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ id: z.string().uuid(), hours: z.union([z.literal(24), z.literal(168), z.literal(720)]).default(24), currency: z.enum(["MZN", "ZAR", "USD", "EUR"]).default("MZN") }).parse(v)).handler(async ({ data, context }) => {
  const { data: result, error } = await context.supabase.rpc("get_external_funnel_report", { p_funnel: data.id, p_hours: data.hours });
  if (error) throw new Error("Não foi possível carregar o rastreamento.");
  const report = result as unknown as FunnelReport;
  const { data: sessions, error: sessionError } = await context.supabase.from("funnel_sessions").select("id").eq("funnel_id", data.id).gte("created_at", new Date(Date.now() - data.hours * 3600000).toISOString());
  if (sessionError) throw new Error("Não foi possível carregar as conversões.");
  const ids = (sessions ?? []).map(session => session.id);
  if (!ids.length) return { ...report, checkout: 0, paid: 0 };
  const { data: checkouts, error: checkoutError } = await context.supabase.from("checkout_sessions").select("id,funnel_session_id,products(currency)").eq("user_id", context.userId).in("funnel_session_id", ids);
  if (checkoutError) throw new Error("Não foi possível carregar os checkouts.");
  const selected = (checkouts ?? []).filter(session => (session.products?.currency ?? "MZN") === data.currency);
  const checkoutIds = selected.map(session => session.id);
  let paidIds = new Set<string>();
  if (checkoutIds.length) {
    if (data.currency === "MZN") {
      const { data: payments, error: paymentError } = await context.supabase.from("transactions").select("metadata").eq("user_id", context.userId).eq("status", "paid").eq("is_test", false);
      if (paymentError) throw new Error("Não foi possível carregar as vendas.");
      for (const payment of payments ?? []) { const metadata = payment.metadata as { tracking?: { operation_session_id?: string } } | null; const id = metadata?.tracking?.operation_session_id; if (id && checkoutIds.includes(id)) paidIds.add(id); }
    } else {
      const { data: payments, error: paymentError } = await context.supabase.from("international_payments").select("checkout_session_id").eq("user_id", context.userId).eq("currency", data.currency).eq("status", "paid").in("checkout_session_id", checkoutIds);
      if (paymentError) throw new Error("Não foi possível carregar as vendas.");
      paidIds = new Set((payments ?? []).flatMap(payment => payment.checkout_session_id ? [payment.checkout_session_id] : []));
    }
  }
  return { ...report, checkout: new Set(selected.map(session => session.funnel_session_id)).size, paid: new Set(selected.filter(session => paidIds.has(session.id)).map(session => session.funnel_session_id)).size };
});