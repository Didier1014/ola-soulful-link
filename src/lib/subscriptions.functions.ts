import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  customer_name: z.string().trim().min(1).max(120),
  customer_phone: z.string().trim().min(6).max(20),
  plan_name: z.string().trim().min(1).max(120),
  amount_mzn: z.number().min(1).max(1_000_000),
  interval: z.enum(["weekly", "monthly", "yearly"]).default("monthly"),
});

export const listSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("subscriptions").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const next = new Date();
    if (data.interval === "weekly") next.setDate(next.getDate() + 7);
    else if (data.interval === "yearly") next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
    const { data: row, error } = await context.supabase
      .from("subscriptions")
      .insert({ user_id: context.userId, ...data, next_charge_at: next.toISOString() })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setSubscriptionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["active", "paused", "cancelled"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("subscriptions").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
