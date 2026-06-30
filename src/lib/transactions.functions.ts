// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkApiStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { ok: false, configured: false, latency_ms: 0, message: "Gateway não configurado" };
});



const checkoutSchema = z.object({
  product_id: z.string().uuid().optional(),
  amount_mzn: z.number().min(100, "Valor mínimo é 100 MT").max(1_000_000).optional(),
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().max(160).optional().or(z.literal("")).default(""),
  customer_phone: z.string().trim().regex(/^\+?\d{8,15}$/, "Telefone inválido"),
  method: z.enum(["mpesa", "emola", "card"]),
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
});

// Taxa cobrada ao vendedor: 15% + 15 MT.
// Aplicada para calcular o líquido a creditar ao vendedor.
function calcFee(amount: number) {
  const seller_fee = Math.round((amount * 0.15 + 15) * 100) / 100;
  const seller_net = Math.round((amount - seller_fee) * 100) / 100;
  return { seller_fee, seller_net };
}

async function creditSellerIfPending(supabaseAdmin: any, txId: string, userId: string, sellerNet: number, updates: Record<string, unknown>) {
  const { data: changed } = await supabaseAdmin
    .from("transactions")
    .update({ ...updates, status: "paid" })
    .eq("id", txId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (!changed) return false;
  const { data: prof } = await supabaseAdmin.from("profiles").select("balance_mzn").eq("id", userId).maybeSingle();
  await supabaseAdmin.from("profiles").update({ balance_mzn: Number(prof?.balance_mzn ?? 0) + sellerNet }).eq("id", userId);
  try {
    const { notifyNewSale } = await import("@/lib/sale-notify.server");
    await notifyNewSale(supabaseAdmin, txId);
  } catch (e) {
    console.log("[creditSellerIfPending] notifyNewSale error", e);
  }
  return true;
}

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => checkoutSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id,user_id,price_mzn,active,name")
      .eq("id", data.product_id).maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!product || !product.active) throw new Error("Produto indisponível");

    const amount = data.amount_mzn ?? Number(product.price_mzn);
    if (amount < 100) throw new Error("Valor mínimo é 100 MT");
    const { seller_fee, seller_net } = calcFee(amount);

    const trackingClean = data.tracking
      ? Object.fromEntries(Object.entries(data.tracking).filter(([_, v]) => v != null && v !== ""))
      : null;
    const { data: tx, error: tErr } = await supabaseAdmin.from("transactions").insert({
      user_id: product.user_id,
      product_id: product.id,
      customer_name: data.customer_name,
      customer_email: data.customer_email || null,
      customer_phone: data.customer_phone,
      method: data.method,
      amount_mzn: amount,
      fee_mzn: seller_fee,
      net_mzn: seller_net,
      status: "pending",
      external_ref: null,
      metadata: trackingClean && Object.keys(trackingClean).length ? { tracking: trackingClean } : null,
    }).select().single();
    if (tErr) throw new Error(tErr.message);

    // Modo simulação — sem gateway de pagamento integrado
    await supabaseAdmin.from("transactions").update({ status: "paid", external_ref: `SIM-${Date.now()}` }).eq("id", tx.id);
    const { data: prof } = await supabaseAdmin.from("profiles").select("balance_mzn").eq("id", product.user_id).maybeSingle();
    await supabaseAdmin.from("profiles").update({ balance_mzn: Number(prof?.balance_mzn ?? 0) + seller_net }).eq("id", product.user_id);
    try {
      const { notifyNewSale } = await import("@/lib/sale-notify.server");
      await notifyNewSale(supabaseAdmin, tx.id);
    } catch (e) {
      console.log("[createCheckout] notifyNewSale error", e);
    }
    const { data: prod } = await supabaseAdmin.from("products").select("delivery_url").eq("id", product.id).maybeSingle();
    return { id: tx.id, status: "paid", amount, fee: seller_fee, net: seller_net, delivery_url: prod?.delivery_url ?? undefined, message: "Pagamento confirmado" };
  });



// Polling — devolve estado actual da transacção.
export const checkTransactionStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ transaction_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tx } = await supabaseAdmin
      .from("transactions").select("*").eq("id", data.transaction_id).maybeSingle();
    if (!tx) throw new Error("Transacção não encontrada");
    if (tx.status === "paid" && tx.product_id) {
      const { data: prod } = await supabaseAdmin
        .from("products").select("delivery_url").eq("id", tx.product_id).maybeSingle();
      return { status: tx.status, delivery_url: prod?.delivery_url ?? undefined };
    }
    return { status: tx.status };
  });



export const listMyTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("transactions").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);

    try {
      const paid = (data ?? []).filter((t: any) => t.status === "paid").slice(0, 20);
      if (paid.length) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: notified } = await supabaseAdmin
          .from("notifications")
          .select("data")
          .eq("user_id", context.userId)
          .eq("type", "sale")
          .order("created_at", { ascending: false })
          .limit(200);
        const notifiedSet = new Set(
          (notified ?? []).map((n: any) => n?.data?.transaction_id).filter(Boolean),
        );
        const missing = paid.filter((t: any) => !notifiedSet.has(t.id));
        if (missing.length) {
          const { notifyNewSale } = await import("@/lib/sale-notify.server");
          Promise.all(
            missing.map((t: any) =>
              notifyNewSale(supabaseAdmin, t.id).catch((e) =>
                console.log(`[listMyTransactions] notifyNewSale(${t.id}) failed`, e),
              ),
            ),
          );
        }
      }
    } catch (e) {
      console.log("[listMyTransactions] safety-net error", e);
    }

    return data ?? [];
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: txs } = await context.supabase
      .from("transactions").select("amount_mzn,net_mzn,status,created_at,method");
    const { data: prof } = await context.supabase
      .from("profiles").select("balance_mzn,full_name,business_name").eq("id", context.userId).maybeSingle();
    const paid = (txs ?? []).filter(t => t.status === "paid");
    const total = paid.reduce((s, t) => s + Number(t.amount_mzn), 0);
    const count = (txs ?? []).length;
    const conv = count ? Math.round((paid.length / count) * 100) : 0;
    return {
      balance: Number(prof?.balance_mzn ?? 0),
      total_volume: total,
      total_tx: count,
      paid_tx: paid.length,
      conversion: conv,
      profile: prof,
      recent: (txs ?? []).slice(0, 30),
    };
  });

export const createWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    amount_mzn: z.number().positive().max(10_000_000),
    method: z.enum(["mpesa", "emola", "bank"]),
    destination: z.string().trim().min(3).max(120),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: prof, error: pErr } = await context.supabase
      .from("profiles").select("balance_mzn").eq("id", context.userId).maybeSingle();
    if (pErr) throw new Error(pErr.message);
    const bal = Number(prof?.balance_mzn ?? 0);
    if (data.amount_mzn > bal) throw new Error(`Saldo insuficiente. Disponível: ${bal.toFixed(0)} MT`);
    if (data.amount_mzn < 100) throw new Error("Valor mínimo de saque: 100 MT");

    const { error } = await context.supabase.from("withdrawals").insert({
      user_id: context.userId,
      amount_mzn: data.amount_mzn,
      method: data.method,
      destination: data.destination,
    });
    if (error) throw new Error(error.message);

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: admins } = await supabaseAdmin
        .from("user_roles").select("user_id").eq("role", "admin");
      const { data: reqProfile } = await supabaseAdmin
        .from("profiles").select("full_name,business_name").eq("id", context.userId).maybeSingle();
      const who = reqProfile?.business_name || reqProfile?.full_name || "Utilizador";
      const fmt = new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(data.amount_mzn);
      const title = "Novo pedido de saque";
      const message = `${who} solicitou saque de ${fmt} MT via ${data.method.toUpperCase()}`;
      const ids = (admins ?? []).map((a: any) => a.user_id);
      if (ids.length) {
        const { sendPushToUser } = await import("@/lib/push.functions");
        await Promise.all(ids.map((uid: string) =>
          sendPushToUser(supabaseAdmin, uid, title, message, "/dashboard/admin").catch(() => {})
        ));
      }
    } catch (e) { console.log("[withdrawal] notify admins failed", e); }

    return { ok: true };
  });

export const listMyWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("withdrawals")
      .select("id, amount_mzn, method, destination, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
