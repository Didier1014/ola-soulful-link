import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().default(""),
  price_mzn: z.number().min(0).max(1_000_000),
  cover_path: z.string().trim().max(500).optional().default(""),
  delivery_url: z.string().url().max(500).optional().or(z.literal("")).default(""),
  pixel_id: z.string().trim().max(100).optional().default(""),
  utimify_id: z.string().trim().max(100).optional().default(""),
  lawtracker_id: z.string().trim().max(100).optional().default(""),
  support_phone: z.string().trim().max(20).optional().default(""),
});

const updateSchema = productSchema.extend({
  id: z.string().uuid(),
});

// short 5-char alphanumeric id (lowercase) — e.g. "eed3d"
function shortId(len = 5) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
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

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => productSchema.parse(d))
  .handler(async ({ data, context }) => {
    let slug = shortId();
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await context.supabase
        .from("products").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      slug = shortId();
    }
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
        pixel_id: data.pixel_id || null,
        utimify_id: data.utimify_id || null,
        lawtracker_id: data.lawtracker_id || null,
        support_phone: data.support_phone || null,
      })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, name, description, price_mzn, cover_path, delivery_url, pixel_id, utimify_id, lawtracker_id, support_phone } = data;
    const { error } = await context.supabase
      .from("products")
      .update({
        name,
        description: description || null,
        price_mzn,
        cover_url: cover_path || null,
        delivery_url: delivery_url || null,
        pixel_id: pixel_id || null,
        utimify_id: utimify_id || null,
        lawtracker_id: lawtracker_id || null,
        support_phone: support_phone || null,
      })
      .eq("id", id);
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

// Public — fetch product by slug for checkout
export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .select("id,user_id,slug,name,description,price_mzn,cover_url,delivery_url,active,pixel_id,utimify_id,lawtracker_id,support_phone")
      .eq("slug", data.slug).eq("active", true).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Produto não encontrado");
    return { ...row, cover_url: await signCover(supabaseAdmin, row.cover_url) };
  });
