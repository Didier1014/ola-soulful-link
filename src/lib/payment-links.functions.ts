import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function calcFee(amount: number) {
  const seller_fee = Math.round((amount * 0.15 + 15) * 100) / 100;
  const rlx_cost = Math.round((amount * 0.10 + 10) * 100) / 100;
  const admin_margin = Math.round((seller_fee - rlx_cost) * 100) / 100;
  const seller_net = Math.round((amount - seller_fee) * 100) / 100;
  return { seller_fee, rlx_cost, admin_margin, seller_net };
}
function normalizePhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("258") ? d.slice(3) : d;
}
function getCurrentOrigin() {
  const request = getRequest();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  return process.env.SITE_URL || new URL(request.url).origin;
}

export const getLinkBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link, error } = await supabaseAdmin
      .from("payment_links")
      .select("id,user_id,title,description,amount_mzn,active,slug")
      .eq("slug", data.slug).maybeSingle();
    if (error) throw new Error(error.message);
    if (!link || !link.active) throw new Error("Link indisponível");
    const current = (await supabaseAdmin.from("payment_links").select("clicks").eq("id", link.id).maybeSingle()).data?.clicks ?? 0;
    await supabaseAdmin.from("payment_links").update({ clicks: current + 1 }).eq("id", link.id);
    return link;
  });

export const payLink = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    link_id: z.string().uuid(),
    customer_name: z.string().trim().min(2).max(120),
    customer_email: z.string().trim().email().max(160).optional().or(z.literal("")).default(""),
    customer_phone: z.string().trim().regex(/^\+?\d{8,15}$/, "Telefone inválido"),
    method: z.enum(["mpesa", "emola"]),
    tracking: z.object({
      src: z.string().max(200).optional(),
      sck: z.string().max(200).optional(),
      utm_source: z.string().max(200).optional(),
      utm_campaign: z.string().max(200).optional(),
      utm_medium: z.string().max(200).optional(),
      utm_content: z.string().max(200).optional(),
      utm_term: z.string().max(200).optional(),
      fbp: z.string().max(200).optional(),
      fbc: z.string().max(200).optional(),
    }).partial().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin.from("payment_links")
      .select("id,user_id,amount_mzn,active,payments_count").eq("id", data.link_id).maybeSingle();
    if (!link || !link.active) throw new Error("Link indisponível");
    const amount = Number(link.amount_mzn);
    const { seller_fee, seller_net } = calcFee(amount);

    const token = process.env.RLX_API_TOKEN;
    // Insert transaction FIRST with pending status
    const trackingClean = data.tracking
      ? Object.fromEntries(Object.entries(data.tracking).filter(([_, v]) => v != null && v !== ""))
      : null;
    const { data: tx, error } = await supabaseAdmin.from("transactions").insert({
      user_id: link.user_id, customer_name: data.customer_name, customer_email: data.customer_email || null,
      customer_phone: data.customer_phone, method: data.method, amount_mzn: amount, fee_mzn: seller_fee, net_mzn: seller_net, status: "pending", external_ref: null,
      metadata: trackingClean && Object.keys(trackingClean).length ? { tracking: trackingClean } : null,
    }).select().single();
    if (error) throw new Error(error.message);

    // Fire-and-forget — Vercel Hobby kills functions after 10s, processador demora 30-60s.
    if (token) {
      const phone = normalizePhone(data.customer_phone);
      const webhookUrl = `${getCurrentOrigin()}/api/public/webhook-payment?tx_id=${tx.id}`;
      fetch("https://checkout.rlxl.ink/api.php", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "pay", phone, amount, nome_cliente: data.customer_name, webhook_url: webhookUrl }),
      }).catch((e) => console.log(`[payment-link][sale:${tx.id}] RLX pay failed`, e));
    } else {
      await supabaseAdmin.from("transactions").update({ status: "paid", external_ref: `SIM-${Date.now()}` }).eq("id", tx.id);
      await supabaseAdmin.from("payment_links").update({ payments_count: (link.payments_count ?? 0) + 1 }).eq("id", link.id);
      const { data: prof } = await supabaseAdmin.from("profiles").select("balance_mzn").eq("id", link.user_id).maybeSingle();
      await supabaseAdmin.from("profiles").update({ balance_mzn: Number(prof?.balance_mzn ?? 0) + seller_net }).eq("id", link.user_id);
      try {
        const { notifyNewSale } = await import("@/lib/sale-notify.server");
        await notifyNewSale(supabaseAdmin, tx.id);
      } catch (e) {
        console.log(`[payment-link][sale:${tx.id}] notifyNewSale failed`, e);
      }
    }
    return { id: tx.id, status: "pending" };
  });

const schema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().max(1000).optional().default(""),
  amount_mzn: z.number().min(1).max(1_000_000),
});

function shortId(len = 7) {
  const a = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = ""; for (let i = 0; i < len; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export const listLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payment_links").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    for (let i = 0; i < 5; i++) {
      const slug = shortId();
      const { data: row, error } = await context.supabase
        .from("payment_links")
        .insert({ user_id: context.userId, slug, ...data })
        .select().single();
      if (!error) return row;
      if (!error.message.includes("payment_links_slug_key")) throw new Error(error.message);
    }
    throw new Error("Não foi possível gerar link único");
  });

export const toggleLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase
      .from("payment_links")
      .update({ active: data.active }, { count: "exact" })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    if (!count) throw new Error("Link não encontrado");
    return { ok: true };
  });

export const deleteLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase
      .from("payment_links")
      .delete({ count: "exact" })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error((error as any).message);
    if (!count) throw new Error("Link não encontrado");
    return { ok: true };
  });
