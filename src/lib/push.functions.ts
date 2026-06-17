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
): Promise<{ ok: boolean; reason?: string }> {
  const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
  const sub = user?.user?.user_metadata?.push_subscription as
    | { endpoint: string; p256dh: string; auth: string }
    | undefined;
  if (!sub) {
    console.log(`[push] user=${userId} no_subscription`);
    return { ok: false, reason: "no_subscription" };
  }

  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    console.log(`[push] vapid_missing`);
    return { ok: false, reason: "vapid_missing" };
  }

  try {
    const { sendWebPushNotification } = await import("@/lib/webpush.server");
    const res = await sendWebPushNotification(
      sub,
      JSON.stringify({ title, body, url }),
      {
        publicKey: vapidPublic,
        privateKey: vapidPrivate,
        subject: process.env.VAPID_SUBJECT || "mailto:admin@redoxpay.com",
      },
    );
    console.log(`[push] user=${userId} → HTTP ${res.status} ${res.body.slice(0, 200)}`);
    if (res.status === 404 || res.status === 410) {
      const meta = user?.user?.user_metadata ?? {};
      const cleaned = Object.fromEntries(Object.entries(meta).filter(([k]) => k !== "push_subscription"));
      await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: cleaned });
      return { ok: false, reason: `gone:${res.status}` };
    }
    if (res.status >= 200 && res.status < 300) return { ok: true };
    return { ok: false, reason: `http:${res.status}` };
  } catch (e: any) {
    console.log(`[push] user=${userId} send_failed`, e?.message ?? e);
    return { ok: false, reason: `send_failed:${e?.message ?? "unknown"}` };
  }
}