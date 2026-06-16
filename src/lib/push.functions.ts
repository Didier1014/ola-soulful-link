// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const subscribePush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      endpoint: z.string().url(),
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const meta = user?.user?.user_metadata ?? {};
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      user_metadata: {
        ...meta,
        push_subscription: { endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth },
      },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unsubscribePush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const meta = user?.user?.user_metadata ?? {};
    const cleaned = Object.fromEntries(
      Object.entries(meta).filter(([k]) => k !== "push_subscription")
    );
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      user_metadata: cleaned,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export async function sendPushToUser(
  supabaseAdmin: any,
  userId: string,
  title: string,
  body: string,
  url?: string,
) {
  const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
  const sub = user?.user?.user_metadata?.push_subscription as
    | { endpoint: string; p256dh: string; auth: string }
    | undefined;
  if (!sub) return;

  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) return;

  const webpush = await import("web-push");
  webpush.setVapidDetails("mailto:admin@redoxpay.com", vapidPublic, vapidPrivate);

  try {
    await webpush.sendNotification({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    }, JSON.stringify({ title, body, url }));
  } catch {
    // subscription expired — remove it from metadata
    const meta = user?.user?.user_metadata ?? {};
    const cleaned = Object.fromEntries(
      Object.entries(meta).filter(([k]) => k !== "push_subscription")
    );
    await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: cleaned });
  }
}