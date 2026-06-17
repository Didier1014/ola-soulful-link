// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getVapidPublicKey = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) throw new Error("VAPID_PUBLIC_KEY não configurada");
    return { key };
  });

export const hasInvalidPushSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id,last_error,invalidated_at,status")
      .eq("user_id", context.userId)
      .eq("status", "invalid")
      .limit(1)
      .maybeSingle();
    return { invalid: Boolean(data?.id), reason: data?.last_error ?? null };
  });

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
    // Upsert into dedicated table (multi-device, survives user_metadata changes)
    const { error: tblErr } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: context.userId,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          status: "active",
          last_error: null,
          invalidated_at: null,
        },
        { onConflict: "endpoint" },
      );
    if (tblErr) {
      console.log("[push] subscribe table error", tblErr.message);
      throw new Error(tblErr.message);
    }
    // Also mirror to user_metadata for legacy reads (best-effort)
    try {
      const { data: user } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      const meta = user?.user?.user_metadata ?? {};
      await supabaseAdmin.auth.admin.updateUserById(context.userId, {
        user_metadata: { ...meta, push_subscription: { endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth } },
      });
    } catch {}
    console.log(`[push] subscribed user=${context.userId} endpoint=${data.endpoint.slice(0, 50)}...`);
    return { ok: true };
  });

export const unsubscribePush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ endpoint: z.string().url().optional() }).optional().parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("push_subscriptions").delete().eq("user_id", context.userId);
    if (data?.endpoint) q = q.eq("endpoint", data.endpoint);
    await q;
    try {
      const { data: user } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      const meta = user?.user?.user_metadata ?? {};
      const cleaned = Object.fromEntries(Object.entries(meta).filter(([k]) => k !== "push_subscription"));
      await supabaseAdmin.auth.admin.updateUserById(context.userId, { user_metadata: cleaned });
    } catch {}
    return { ok: true };
  });

export async function sendPushToUser(
  supabaseAdmin: any,
  userId: string,
  title: string,
  body: string,
  url?: string,
): Promise<{ ok: boolean; reason?: string; sent?: number; failed?: number; attempts?: Array<{ endpoint: string; status?: number; ok?: boolean; error?: string; body?: string }> }> {
  // Collect subscriptions: dedicated table + legacy user_metadata fallback
  const subs: Array<{ endpoint: string; p256dh: string; auth: string; id?: string }> = [];

  const { data: rows, error: rowsErr } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", userId)
    .eq("status", "active");
  if (rowsErr) console.log(`[push] user=${userId} table read error`, rowsErr.message);
  if (rows && rows.length) subs.push(...rows);

  try {
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
    const legacy = user?.user?.user_metadata?.push_subscription as
      | { endpoint: string; p256dh: string; auth: string }
      | undefined;
    if (legacy && !subs.some((s) => s.endpoint === legacy.endpoint)) {
      subs.push(legacy);
      // Migrate legacy subscription into the table for next time
      try {
        await supabaseAdmin
          .from("push_subscriptions")
          .upsert({ user_id: userId, ...legacy }, { onConflict: "endpoint" });
      } catch {}
    }
  } catch {}

  if (subs.length === 0) {
    console.log(`[push] user=${userId} no_subscription`);
    return { ok: false, reason: "no_subscription", attempts: [] };
  }

  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    console.log(`[push] vapid_missing`);
    return { ok: false, reason: "vapid_missing", attempts: [] };
  }

  const { sendWebPushNotification } = await import("@/lib/webpush.server");
  const vapid = {
    publicKey: vapidPublic,
    privateKey: vapidPrivate,
    subject: process.env.VAPID_SUBJECT || "mailto:admin@redoxpay.com",
  };
  const payload = JSON.stringify({ title, body, url });
  async function invalidateSubscription(endpoint: string, reason: string) {
    try {
      await supabaseAdmin
        .from("push_subscriptions")
        .update({ status: "invalid", last_error: reason, invalidated_at: new Date().toISOString() })
        .eq("endpoint", endpoint);
    } catch {}
    try {
      const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
      const meta = user?.user?.user_metadata ?? {};
      if (meta?.push_subscription?.endpoint === endpoint) {
        const cleaned = Object.fromEntries(Object.entries(meta).filter(([k]) => k !== "push_subscription"));
        await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: cleaned });
      }
    } catch {}
  }

  let sent = 0, failed = 0;
  const attempts: Array<{ endpoint: string; status?: number; ok?: boolean; error?: string; body?: string }> = [];
  for (const sub of subs) {
    try {
      const res = await sendWebPushNotification(sub, payload, vapid);
      attempts.push({ endpoint: sub.endpoint.slice(0, 80), status: res.status, ok: res.status >= 200 && res.status < 300, body: (res.body || "").slice(0, 300) });
      console.log(`[push] user=${userId} ep=${sub.endpoint.slice(0, 40)}... → HTTP ${res.status} ${(res.body || "").slice(0, 200)}`);
      if (res.status === 404 || res.status === 410 || (res.status === 400 && /VapidPkHashMismatch/i.test(res.body || ""))) {
        // Gone or subscribed with an old VAPID public key — mark as invalid so the UI can prompt re-subscription.
        const reason = res.status === 410 ? "gone_410" : res.status === 404 ? "not_found_404" : "vapid_mismatch";
        await invalidateSubscription(sub.endpoint, reason);
        failed++;
        continue;
      }
      if (res.status >= 200 && res.status < 300) sent++;
      else failed++;
    } catch (e: any) {
      console.log(`[push] user=${userId} send_failed`, e?.message ?? e);
      attempts.push({ endpoint: sub.endpoint.slice(0, 80), ok: false, error: String(e?.message ?? e) });
      failed++;
    }
  }
  return { ok: sent > 0, sent, failed, attempts, reason: sent > 0 ? undefined : "all_failed" };
}
