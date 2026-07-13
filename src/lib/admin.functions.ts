// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase
    .rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Acesso restrito a administradores");
}

async function signCover(supabase: any, path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [
      { count: profiles },
      { count: tx },
      { count: products },
      { count: withdrawals },
      { data: vol },
      { data: fees },
      { data: balances },
      { data: wdPending },
      { data: wdTotal },
      { data: profileDates },
      { data: txDates },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("transactions").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("products").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("withdrawals").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("transactions").select("amount_mzn").eq("status", "paid"),
      supabaseAdmin.from("transactions").select("amount_mzn,fee_mzn").eq("status", "paid"),
      supabaseAdmin.from("profiles").select("balance_mzn"),
      supabaseAdmin.from("withdrawals").select("amount_mzn").eq("status", "pending"),
      supabaseAdmin.from("withdrawals").select("amount_mzn"),
      supabaseAdmin.from("profiles").select("created_at"),
      supabaseAdmin.from("transactions").select("created_at,fee_mzn,amount_mzn,status"),
    ]);

    const totalVolume = (vol ?? []).reduce((a: number, r: any) => a + Number(r.amount_mzn || 0), 0);
    // Lucro estimado = seller_fee (15%+15) - custo processador (~10%+10).
    // Modo simulação — sem custo externo de processamento.
    const totalProfit = (fees ?? []).reduce((a: number, r: any) => {
      const amt = Number(r.amount_mzn || 0);
      const sellerFee = Math.round((amt * 0.15 + 15) * 100) / 100;
      const providerCost = Math.round((amt * 0.10 + 10) * 100) / 100;
      return a + (sellerFee - providerCost);
    }, 0);
    const totalBalance = (balances ?? []).reduce((a: number, r: any) => a + Number(r.balance_mzn || 0), 0);
    const pendingWd = (wdPending ?? []).reduce((a: number, r: any) => a + Number(r.amount_mzn || 0), 0);
    const totalWd = (wdTotal ?? []).reduce((a: number, r: any) => a + Number(r.amount_mzn || 0), 0);

    // User signup timeline (daily)
    const userGrowth: Record<string, number> = {};
    (profileDates ?? []).forEach((p: any) => {
      const day = new Date(p.created_at).toISOString().slice(0, 10);
      userGrowth[day] = (userGrowth[day] || 0) + 1;
    });

    // Revenue timeline (daily) and new transactions
    const revenueGrowth: Record<string, number> = {};
    const txTimeline: Record<string, number> = {};
    (txDates ?? []).forEach((t: any) => {
      const day = new Date(t.created_at).toISOString().slice(0, 10);
      if (t.status === "paid") {
        const amt = Number(t.amount_mzn || 0);
        const sellerFee = Math.round((amt * 0.15 + 15) * 100) / 100;
        const providerCost = Math.round((amt * 0.10 + 10) * 100) / 100;
        revenueGrowth[day] = (revenueGrowth[day] || 0) + (sellerFee - providerCost);
      }
      txTimeline[day] = (txTimeline[day] || 0) + 1;
    });

    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      return d.toISOString().slice(0, 10);
    });

    const today = new Date().toISOString().slice(0, 10);
    const profitToday = revenueGrowth[today] || 0;

    return {
      profiles: profiles ?? 0,
      transactions: tx ?? 0,
      products: products ?? 0,
      withdrawals: withdrawals ?? 0,
      volume_mzn: totalVolume,
      profit_mzn: totalProfit,
      profit_today_mzn: profitToday,
      user_balance_mzn: totalBalance,
      pending_withdrawals_mzn: pendingWd,
      total_withdrawals_mzn: totalWd,
      // Charts
      user_growth: last30.map(d => ({ date: d, count: userGrowth[d] || 0 })),
      revenue_growth: last30.map(d => ({ date: d, value: revenueGrowth[d] || 0 })),
      tx_timeline: last30.map(d => ({ date: d, count: txTimeline[d] || 0 })),
    };
  });

export const approveWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: { id: string } }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: wd, error: wdErr } = await supabaseAdmin
      .from("withdrawals").select("*").eq("id", data.id).maybeSingle();
    if (wdErr) throw new Error(wdErr.message);
    if (!wd) throw new Error("Saque não encontrado");
    if (wd.status !== "pending") throw new Error("Saque já foi processado");

    const { data: prof, error: pErr } = await supabaseAdmin
      .from("profiles").select("balance_mzn").eq("id", wd.user_id).maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!prof) throw new Error("Utilizador não encontrado");

    const bal = Math.round(Number(prof.balance_mzn) * 100) / 100;
    const amt = Math.round(Number(wd.amount_mzn) * 100) / 100;

    // Tolerância de 1 MT para arredondamentos. Caso falte muito → auto-rejeitar com motivo claro.
    if (bal + 0.999 < amt) {
      await supabaseAdmin.from("withdrawals").update({ status: "rejected" }).eq("id", data.id);
      try {
        await supabaseAdmin.from("notifications").insert({
          user_id: wd.user_id, type: "withdrawal_rejected",
          title: "Saque rejeitado",
          message: `Saldo insuficiente para processar saque de ${amt} MT (disponível: ${bal} MT).`,
        });
      } catch {}
      throw new Error(`Saldo insuficiente. Disponível: ${bal} MT · Pedido: ${amt} MT. Saque rejeitado automaticamente.`);
    }

    const newBal = Math.max(0, Math.round((bal - amt) * 100) / 100);
    const { error: uErr } = await supabaseAdmin.from("profiles")
      .update({ balance_mzn: newBal }).eq("id", wd.user_id);
    if (uErr) throw new Error("Erro ao actualizar saldo: " + uErr.message);

    const { error: wErr } = await supabaseAdmin.from("withdrawals")
      .update({ status: "paid" }).eq("id", data.id);
    if (wErr) throw new Error("Erro ao actualizar saque: " + wErr.message);

    try {
      const fmt = new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(amt);
      await supabaseAdmin.from("notifications").insert({
        user_id: wd.user_id, type: "withdrawal_paid",
        title: "Saque pago", message: `O seu saque de ${fmt} MT foi processado.`,
      });
    } catch {}
    return { ok: true, balance_mzn: newBal };
  });


export const rejectWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: { id: string } }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("withdrawals")
      .update({ status: "rejected" }).eq("id", data.id);
    if (error) throw new Error(error.message);

    // Notify the user
    try {
      const { data: wd } = await supabaseAdmin.from("withdrawals")
        .select("user_id, amount_mzn").eq("id", data.id).maybeSingle();
      if (wd) {
        const fmt = new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(Number(wd.amount_mzn));
        await supabaseAdmin.from("notifications").insert({
          user_id: wd.user_id, type: "withdrawal_rejected",
          title: "Saque rejeitado", message: `O seu pedido de ${fmt} MT foi rejeitado.`,
        });
      }
    } catch {}
    return { ok: true };
  });

export const listAllProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAllTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("transactions").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAllWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: wds, error } = await supabaseAdmin
      .from("withdrawals").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((wds ?? []).map((w: any) => w.user_id)));
    let profilesMap: Record<string, any> = {};
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles").select("id, full_name, business_name, phone").in("id", userIds);
      (profs ?? []).forEach((p: any) => { profilesMap[p.id] = p; });
    }
    return (wds ?? []).map((w: any) => ({ ...w, profiles: profilesMap[w.user_id] ?? null }));
  });


async function computeClickCounts(supabase: any, ids: string[]): Promise<Record<string, number>> {
  const clicks: Record<string, number> = {};
  if (!ids.length) return clicks;
  const { data: cs } = await supabase.from("product_clicks").select("product_id").in("product_id", ids);
  for (const c of cs ?? []) {
    const k = c.product_id as string;
    clicks[k] = (clicks[k] || 0) + 1;
  }
  return clicks;
}

export const listAllProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    let products: any[] = data ?? [];
    const userIds = Array.from(new Set(products.map((p: any) => p.user_id).filter(Boolean)));
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles").select("id, full_name, business_name").in("id", userIds);
      const map = new Map((profs ?? []).map((pr: any) => [pr.id, pr]));
      products = products.map((p: any) => ({ ...p, profiles: map.get(p.user_id) ?? null }));
    }
    const ids = products.map((p: any) => p.id);
    const stats: Record<string, { count: number; total: number }> = {};
    if (ids.length) {
      const { data: txs } = await supabaseAdmin
        .from("transactions")
        .select("product_id, net_mzn")
        .in("product_id", ids)
        .eq("status", "paid");
      for (const t of txs ?? []) {
        const k = t.product_id as string;
        if (!stats[k]) stats[k] = { count: 0, total: 0 };
        stats[k].count += 1;
        stats[k].total += Number(t.net_mzn ?? 0);
      }
    }
    const clicks = await computeClickCounts(supabaseAdmin, ids);
    return Promise.all(products.map(async (p: any) => ({
      ...p,
      cover_url: await signCover(supabaseAdmin, p.cover_url),
      sales_count: stats[p.id]?.count ?? 0,
      sales_total_mzn: stats[p.id]?.total ?? 0,
      clicks_count: clicks[p.id] ?? 0,
    })));
  });

export const listUserProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: { user_id: string } }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: products, error } = await supabaseAdmin
      .from("products").select("id,name,slug,price_mzn,cover_url,delivery_url,digital_file_path,product_type,active,created_at")
      .eq("user_id", data.user_id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = products ?? [];
    const ids = list.map((p: any) => p.id);
    const stats: Record<string, { count: number; total: number }> = {};
    if (ids.length) {
      const { data: txs } = await supabaseAdmin
        .from("transactions")
        .select("product_id, net_mzn")
        .in("product_id", ids)
        .eq("status", "paid");
      for (const t of txs ?? []) {
        const k = t.product_id as string;
        if (!stats[k]) stats[k] = { count: 0, total: 0 };
        stats[k].count += 1;
        stats[k].total += Number(t.net_mzn ?? 0);
      }
    }
    const clicks = await computeClickCounts(supabaseAdmin, ids);
    return Promise.all(list.map(async (p: any) => ({
      ...p,
      cover_url: await signCover(supabaseAdmin, p.cover_url),
      sales_count: stats[p.id]?.count ?? 0,
      sales_total_mzn: stats[p.id]?.total ?? 0,
      clicks_count: clicks[p.id] ?? 0,
    })));
  });

export const getProductHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: { product_id: string } }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("product_history")
      .select("id, changed_at, user_id, changes")
      .eq("product_id", data.product_id)
      .order("changed_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getProductClicks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: { product_id: string } }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("product_clicks")
      .select("id, created_at, user_agent, referrer")
      .eq("product_id", data.product_id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });


export const getDigitalSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: { path: string } }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("product-digital").createSignedUrl(data.path, 60 * 60);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });

export const setProductApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: { product_id: string; status: "approved" | "rejected" | "pending"; reason?: string } }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = { approval_status: data.status, rejection_reason: data.status === "rejected" ? (data.reason || null) : null };
    const { data: prod, error } = await supabaseAdmin.from("products").update(patch).eq("id", data.product_id).select("id,name,slug,user_id").maybeSingle();
    if (error) throw new Error(error.message);
    if (prod) {
      const title = data.status === "approved" ? "Produto aprovado" : data.status === "rejected" ? "Produto rejeitado" : "Produto pendente";
      const msg = data.status === "approved"
        ? `"${prod.name}" foi aprovado e já está disponível.`
        : data.status === "rejected"
          ? `"${prod.name}" foi rejeitado.${data.reason ? " Motivo: " + data.reason : ""}`
          : `"${prod.name}" voltou para revisão.`;
      await supabaseAdmin.from("notifications").insert({
        user_id: prod.user_id, type: "product_approval_result", title, message: msg,
        data: { product_id: prod.id, slug: prod.slug, status: data.status },
      });
    }
    return { ok: true };
  });

export const getUserDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: { user_id: string } }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = data.user_id;

    const [profileR, authR, prodsR, txsR, wdsR, notifsR, rolesR] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(uid),
      supabaseAdmin.from("products").select("id,name,slug,price_mzn,active,product_type,created_at").eq("user_id", uid).order("created_at", { ascending: false }),
      supabaseAdmin.from("transactions").select("id,amount_mzn,net_mzn,fee_mzn,status,created_at,product_id,external_ref").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("withdrawals").select("id,amount_mzn,status,created_at,method,destination").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("notifications").select("id,type,title,message,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", uid),
    ]);

    if (profileR.error) throw new Error(profileR.error.message);
    const txs = txsR.data ?? [];
    const paid = txs.filter((t: any) => t.status === "paid");
    const totalRevenue = paid.reduce((a: number, t: any) => a + Number(t.net_mzn ?? 0), 0);
    const totalVolume = paid.reduce((a: number, t: any) => a + Number(t.amount_mzn ?? 0), 0);
    const totalFees = paid.reduce((a: number, t: any) => a + Number(t.fee_mzn ?? 0), 0);
    const wds = wdsR.data ?? [];
    const paidWd = wds.filter((w: any) => w.status === "paid").reduce((a: number, w: any) => a + Number(w.amount_mzn ?? 0), 0);
    const pendingWd = wds.filter((w: any) => w.status === "pending").reduce((a: number, w: any) => a + Number(w.amount_mzn ?? 0), 0);

    return {
      profile: profileR.data,
      email: authR.data?.user?.email ?? null,
      last_sign_in_at: authR.data?.user?.last_sign_in_at ?? null,
      email_confirmed_at: authR.data?.user?.email_confirmed_at ?? null,
      roles: (rolesR.data ?? []).map((r: any) => r.role),
      products: prodsR.data ?? [],
      transactions: txs,
      withdrawals: wds,
      notifications: notifsR.data ?? [],
      stats: {
        products_count: (prodsR.data ?? []).length,
        transactions_count: txs.length,
        paid_count: paid.length,
        total_revenue_mzn: totalRevenue,
        total_volume_mzn: totalVolume,
        total_fees_mzn: totalFees,
        withdrawals_paid_mzn: paidWd,
        withdrawals_pending_mzn: pendingWd,
      },
    };
  });

import { z } from "zod";

export const broadcastMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    title: z.string().min(1).max(120),
    message: z.string().min(1).max(500),
    url: z.string().url().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPushToUser } = await import("@/lib/push.functions");
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("user_id")
      .eq("status", "active");
    const uniq = Array.from(new Set((subs ?? []).map((s: any) => s.user_id)));
    let sent = 0, failed = 0;
    await Promise.all(uniq.map(async (uid: string) => {
      try {
        const r = await sendPushToUser(supabaseAdmin, uid, data.title, data.message, data.url);
        if (r?.ok) sent++; else failed++;
      } catch { failed++; }
    }));
    return { ok: true, users: uniq.length, sent, failed };
  });

export const listMerchantMonitoring = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profs }, { data: products }, { data: links }, { data: clicks }, { data: txs }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, business_name, phone"),
      supabaseAdmin.from("products").select("id, user_id, name, slug, price_mzn, active, approval_status, created_at"),
      supabaseAdmin.from("payment_links").select("id, user_id, title, slug, amount_mzn, active, clicks, payments_count, created_at"),
      supabaseAdmin.from("product_clicks").select("product_id, referrer, created_at").order("created_at", { ascending: false }).limit(5000),
      supabaseAdmin.from("transactions").select("user_id, product_id, status, amount_mzn, metadata, created_at").order("created_at", { ascending: false }).limit(5000),
    ]);

    const host = (r?: string | null) => {
      if (!r) return null;
      try { return new URL(r).hostname.replace(/^www\./, ""); } catch { return null; }
    };

    const clickByProduct: Record<string, { count: number; refs: Record<string, number> }> = {};
    for (const c of clicks ?? []) {
      const k = c.product_id as string;
      if (!clickByProduct[k]) clickByProduct[k] = { count: 0, refs: {} };
      clickByProduct[k].count++;
      const h = host(c.referrer);
      if (h) clickByProduct[k].refs[h] = (clickByProduct[k].refs[h] || 0) + 1;
    }

    const salesByProduct: Record<string, { count: number; volume: number }> = {};
    const refByUser: Record<string, Record<string, number>> = {};
    for (const t of txs ?? []) {
      if (t.product_id && t.status === "paid") {
        const k = t.product_id as string;
        if (!salesByProduct[k]) salesByProduct[k] = { count: 0, volume: 0 };
        salesByProduct[k].count++;
        salesByProduct[k].volume += Number(t.amount_mzn ?? 0);
      }
      const tr: any = (t.metadata as any)?.tracking;
      const h = tr?.referrer_domain || host(tr?.referrer);
      if (h && t.user_id) {
        if (!refByUser[t.user_id]) refByUser[t.user_id] = {};
        refByUser[t.user_id][h] = (refByUser[t.user_id][h] || 0) + 1;
      }
    }

    const merchants: Record<string, any> = {};
    for (const p of profs ?? []) {
      merchants[p.id] = {
        user_id: p.id,
        name: p.business_name || p.full_name || "Sem nome",
        phone: p.phone,
        products: [] as any[],
        links: [] as any[],
        total_clicks: 0,
        total_sales: 0,
        total_volume_mzn: 0,
        top_referrers: [] as { host: string; count: number }[],
      };
    }

    for (const pr of products ?? []) {
      const m = merchants[pr.user_id];
      if (!m) continue;
      const s = salesByProduct[pr.id] ?? { count: 0, volume: 0 };
      const c = clickByProduct[pr.id] ?? { count: 0, refs: {} };
      m.products.push({
        id: pr.id, name: pr.name, slug: pr.slug, price_mzn: pr.price_mzn,
        active: pr.active, approval_status: pr.approval_status,
        clicks: c.count, sales_count: s.count, volume_mzn: s.volume,
        top_referrers: Object.entries(c.refs).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 3).map(([h, n]) => ({ host: h, count: n })),
      });
      m.total_clicks += c.count;
      m.total_sales += s.count;
      m.total_volume_mzn += s.volume;
      for (const [h, n] of Object.entries(c.refs)) {
        if (!refByUser[pr.user_id]) refByUser[pr.user_id] = {};
        refByUser[pr.user_id][h] = (refByUser[pr.user_id][h] || 0) + (n as number);
      }
    }

    for (const l of links ?? []) {
      const m = merchants[l.user_id];
      if (!m) continue;
      m.links.push(l);
      m.total_clicks += l.clicks ?? 0;
    }

    for (const uid of Object.keys(merchants)) {
      const refs = refByUser[uid] ?? {};
      merchants[uid].top_referrers = Object.entries(refs)
        .sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5)
        .map(([h, n]) => ({ host: h, count: n }));
    }

    return Object.values(merchants)
      .filter((m: any) => m.products.length > 0 || m.links.length > 0)
      .sort((a: any, b: any) => b.total_clicks - a.total_clicks);
  });
