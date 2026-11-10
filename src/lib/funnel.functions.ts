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
export const getFunnelReport = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ id: z.string().uuid(), hours: z.union([z.literal(24), z.literal(168), z.literal(720)]).default(24) }).parse(v)).handler(async ({ data, context }) => {
  const { data: result, error } = await context.supabase.rpc("get_external_funnel_report", { p_funnel: data.id, p_hours: data.hours });
  if (error) throw new Error("Não foi possível carregar o rastreamento."); return result as unknown as FunnelReport;
});