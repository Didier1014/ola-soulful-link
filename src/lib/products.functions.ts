// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(4000).optional().default(""),
  price_mzn: z.number().min(0).max(1_000_000),
  cover_path: z.string().trim().max(500).optional().default(""),
  delivery_url: z.string().url().max(500).optional().or(z.literal("")).default(""),
  thank_you_url: z.string().url().max(500).optional().or(z.literal("")).default(""),
  product_type: z.enum(["external", "digital", "physical", "lead"]).default("external"),
  digital_file_path: z.string().trim().max(500).optional().default(""),
  discount_no_balance: z.number().min(0).max(100).default(0),
  sms_sender_id: z.string().trim().max(20).optional().default(""),
  sms_template: z.string().trim().max(500).optional().default(""),
  pixel_id: z.string().trim().max(100).optional().default(""),
  utimify_id: z.string().trim().max(100).optional().default(""),
  lawtracker_id: z.string().trim().max(100).optional().default(""),
  support_phone: z.string().trim().max(20).optional().default(""),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Slug inválido (apenas letras minúsculas, números e -)").min(3, "Slug deve ter no mínimo 3 caracteres").max(80),
  config: z.record(z.unknown()).optional().default({}),
});

const updateSchema = productSchema.extend({ id: z.string().uuid() });

function shortId(len = 5) {
  const a = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = ""; for (let i = 0; i < len; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

async function signCover(supabase: any, path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export const listMyProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("products").select("*").eq("user_id", context.userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    return Promise.all(rows.map(async (p) => ({ ...p, cover_url: await signCover(context.supabase, p.cover_url) })));
  });

async function uniqueSlug(supabase: any, desired: string): Promise<string> {
  let slug = (desired || shortId()).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60) || shortId();
  for (let i = 0; i < 6; i++) {
    const { data: ex } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
    if (!ex) return slug;
    slug = `${slug}-${shortId(3)}`;
  }
  return shortId(8);
}

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => productSchema.parse(d))
  .handler(async ({ data, context }) => {
    const slug = await uniqueSlug(context.supabase, data.slug);
    const { data: row, error } = await context.supabase
      .from("products")
      .insert({
        user_id: context.userId,
        slug,
        name: data.name,
        description: data.description || null,
        price_mzn: data.price_mzn,
        cover_url: data.cover_path || null,
        delivery_url: data.delivery_url || null,
        thank_you_url: data.thank_you_url || null,
        product_type: data.product_type,
        digital_file_path: data.digital_file_path || null,
        discount_no_balance: data.discount_no_balance,
        sms_sender_id: data.sms_sender_id || null,
        sms_template: data.sms_template || null,
        pixel_id: data.pixel_id || null,
        utimify_id: data.utimify_id || null,
        lawtracker_id: data.lawtracker_id || null,
        support_phone: data.support_phone || null,
        config: data.config || {},
      })
      .select().single();
    if (error) throw new Error(error.message);
    // Notify admins for approval
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
      const { data: seller } = await supabaseAdmin.from("profiles").select("full_name,business_name").eq("id", context.userId).maybeSingle();
      const sellerName = (seller as any)?.business_name || (seller as any)?.full_name || "Vendedor";
      const rows = (admins ?? []).map((a: any) => ({
        user_id: a.user_id,
        type: "product_approval",
        title: "Novo produto para aprovação",
        message: `${sellerName} submeteu "${data.name}" para aprovação.`,
        data: { product_id: row.id, slug: row.slug, seller_id: context.userId },
      }));
      if (rows.length) await supabaseAdmin.from("notifications").insert(rows);
    } catch {}
    return row;
  });


export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const patch: Record<string, unknown> = {
      name: rest.name,
      description: rest.description || null,
      price_mzn: rest.price_mzn,
      cover_url: rest.cover_path || null,
      delivery_url: rest.delivery_url || null,
      thank_you_url: rest.thank_you_url || null,
      product_type: rest.product_type,
      digital_file_path: rest.digital_file_path || null,
      discount_no_balance: rest.discount_no_balance,
      sms_sender_id: rest.sms_sender_id || null,
      sms_template: rest.sms_template || null,
      pixel_id: rest.pixel_id || null,
      utimify_id: rest.utimify_id || null,
      lawtracker_id: rest.lawtracker_id || null,
      support_phone: rest.support_phone || null,
      config: rest.config || {},
    };
    if (rest.slug) {
      const { data: cur } = await context.supabase.from("products").select("slug").eq("id", id).maybeSingle();
      if (cur?.slug !== rest.slug) patch.slug = await uniqueSlug(context.supabase, rest.slug);
    }
    const { error } = await context.supabase.from("products").update(patch).eq("id", id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("products").update({ active: data.active }).eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: src, error: e1 } = await context.supabase
      .from("products").select("*").eq("id", data.id).eq("user_id", context.userId).single();
    if (e1 || !src) throw new Error("Produto não encontrado");
    const slug = await uniqueSlug(context.supabase, `${src.slug}-copy`);
    const { id, created_at, updated_at, ...rest } = src as any;
    const { data: row, error } = await context.supabase
      .from("products").insert({ ...rest, slug, name: `${src.name} (cópia)`, active: false, approval_status: "pending", rejection_reason: null }).select().single();

    if (error) throw new Error(error.message);
    return row;
  });

export const aiGenerateProductCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1).max(120), hint: z.string().max(500).optional().default("") }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI Gateway não configurado");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "És um copywriter de vendas em português de Moçambique. Devolve JSON {\"title\":string,\"description\":string} curto e directo, sem emojis em excesso." },
          { role: "user", content: `Produto: ${data.name}\nNotas: ${data.hint || "(sem notas)"}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) throw new Error(`AI ${r.status}`);
    const j = await r.json();
    try { return JSON.parse(j.choices?.[0]?.message?.content ?? "{}"); }
    catch { return { title: data.name, description: "" }; }
  });

// Public — fetch product by slug for checkout
export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .select("id,user_id,slug,name,description,price_mzn,cover_url,delivery_url,thank_you_url,product_type,discount_no_balance,active,pixel_id,utimify_id,lawtracker_id,support_phone,config")
      .eq("slug", data.slug).eq("active", true).eq("approval_status", "approved").maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Produto não encontrado");
    return { ...row, cover_url: await signCover(supabaseAdmin, row.cover_url) };
  });

// Public — register a checkout page view (click)
export const trackProductClick = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    product_id: z.string().uuid(),
    user_agent: z.string().max(500).optional().default(""),
    referrer: z.string().max(500).optional().default(""),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("product_clicks").insert({
      product_id: data.product_id,
      user_agent: data.user_agent || null,
      referrer: data.referrer || null,
    });
    return { ok: true };
  });

