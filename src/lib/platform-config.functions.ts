// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase
    .rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Acesso restrito a administradores");
}

export const getPlatformConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("platform_config").select("*").eq("id", "config").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      const { data: ins, error: iErr } = await supabaseAdmin.from("platform_config")
        .insert({ id: "config", profit_payout_mpesa: "847389419", profit_payout_emola: "875844372" })
        .select().single();
      if (iErr) throw new Error(iErr.message);
      return ins;
    }
    return data;
  });

export const updatePlatformConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    test_mode: z.enum(["merchant", "general"]).optional(),
    gateway_mode: z.string().optional(),
    profit_payout_mpesa: z.string().optional(),
    profit_payout_emola: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of ["test_mode", "gateway_mode", "profit_payout_mpesa", "profit_payout_emola"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    const { data: row, error } = await supabaseAdmin.from("platform_config")
      .update(patch).eq("id", "config").select().single();
    if (error) throw new Error(error.message);
    return row;
  });
