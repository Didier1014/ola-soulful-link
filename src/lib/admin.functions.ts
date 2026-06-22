// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase
    .rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Acesso restrito a administradores");
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
    // Valor real do custo é devolvido por transacção pelo PayBlack (fee_amount).
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


export const listAllProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products").select("*, profiles!inner(full_name, business_name)").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    const products = data ?? [];
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
    return products.map((p: any) => ({
      ...p,
      sales_count: stats[p.id]?.count ?? 0,
      sales_total_mzn: stats[p.id]?.total ?? 0,
    }));
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
    return list.map((p: any) => ({
      ...p,
      sales_count: stats[p.id]?.count ?? 0,
      sales_total_mzn: stats[p.id]?.total ?? 0,
    }));
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