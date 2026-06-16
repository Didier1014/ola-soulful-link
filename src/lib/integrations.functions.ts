import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getIntegrationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("integration_settings")
      .select("integration_key, settings")
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
