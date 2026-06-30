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
    sender_id: z.string().trim().min(1).max(11).optional().default("RedoxPay"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { hexmoSendSms } = await import("@/lib/hexmo.server");
    const r = await hexmoSendSms({
      recipient: data.phone,
      sender_id: data.sender_id || "RedoxPay",
      message: data.message,
    });
    const { data: row, error } = await context.supabase
      .from("sms_logs")
      .insert({
        user_id: context.userId,
        phone: data.phone,
        message: data.message,
        status: r.ok ? "sent" : "failed",
      })
      .select().single();
    if (error) throw new Error(error.message);
    if (!r.ok) throw new Error(r.error || "Falha ao enviar SMS via Hexmo");
    return row;
  });
