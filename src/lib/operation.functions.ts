import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { OperationData } from "./operation";

export const getOperation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ hours: z.union([z.literal(24), z.literal(168), z.literal(720)]).default(24), resource: z.string().uuid().optional(), currency: z.enum(["MZN", "ZAR", "USD", "EUR"]).default("MZN") }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("get_checkout_operation_currency", { p_hours: data.hours, p_resource: data.resource, p_currency: data.currency });
    if (error) throw new Error("Não foi possível carregar a operação.");
    let countriesQuery = context.supabase.from("checkout_sessions").select("country_code,products(currency)").eq("user_id", context.userId).gte("created_at", new Date(Date.now() - data.hours * 3600000).toISOString());
    if (data.resource) countriesQuery = countriesQuery.or(`product_id.eq.${data.resource},payment_link_id.eq.${data.resource}`);
    const counts: Record<string, number> = {};
    for (let offset = 0; ; offset += 1000) {
      const { data: sessions, error: countryError } = await countriesQuery.order("id").range(offset, offset + 999);
      if (countryError) throw new Error("Não foi possível carregar os países dos visitantes.");
      for (const session of sessions ?? []) {
        if ((session.products?.currency ?? "MZN") !== data.currency) continue;
        const country = session.country_code ?? "unknown"; counts[country] = (counts[country] ?? 0) + 1;
      }
      if ((sessions?.length ?? 0) < 1000) break;
    }
    return { ...(result as unknown as OperationData), countries: Object.entries(counts).map(([code, leads]) => ({ code, leads })).sort((a, b) => b.leads - a.leads) };
  });