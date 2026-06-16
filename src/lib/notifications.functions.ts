// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getUnreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("read", false);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const currencies = ["MZN", "USD", "BRL", "ZAR", "EUR"] as const;
export type Currency = (typeof currencies)[number];

export const getCurrencyPref = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (error) throw new Error(error.message);
    const meta = user?.user?.user_metadata ?? {};
    return {
      currency: (meta.currency as Currency) ?? "MZN",
      notifications_enabled: meta.notifications_enabled !== false,
    };
  });

export const updateUserPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    currency: z.enum(currencies).optional(),
    notifications_enabled: z.boolean().optional(),
    notification_position: z.string().optional(),
    notification_color: z.string().optional(),
    notification_sound: z.boolean().optional(),
    notification_duration: z.number().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (fetchErr) throw new Error(fetchErr.message);
    const existingMeta = current?.user?.user_metadata ?? {};
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      user_metadata: { ...existingMeta, ...data },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTestNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("notifications").insert({
      user_id: context.userId,
      type: "sale",
      title: "Nova venda",
      message: "Pagamento de 500,00 MT recebido — Notificação de teste",
      data: {
        transaction_id: crypto.randomUUID(),
        amount_mzn: 500,
        currency: "MZN",
        customer_name: "Teste",
        product_name: "Produto Teste",
      },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });