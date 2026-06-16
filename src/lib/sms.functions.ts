import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listSms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sms_logs").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const sendSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    phone: z.string().trim().min(6).max(20),
    message: z.string().trim().min(1).max(480),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // Apenas regista o envio — integração real com gateway SMS é configurável.
    const { data: row, error } = await context.supabase
      .from("sms_logs")
      .insert({ user_id: context.userId, phone: data.phone, message: data.message, status: "sent" })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });
