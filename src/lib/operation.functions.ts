import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { OperationData } from "./operation";

export const getOperation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ hours: z.union([z.literal(24), z.literal(168), z.literal(720)]).default(24), resource: z.string().uuid().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("get_checkout_operation", { p_hours: data.hours, p_resource: data.resource });
    if (error) throw new Error("Não foi possível carregar a operação.");
    return result as unknown as OperationData;
  });