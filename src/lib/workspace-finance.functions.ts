import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { currencyPayments, paymentTotals, workspaceCurrencies, type WorkspaceCurrency, type WorkspacePayment } from "./workspace-currency";

export const getWorkspaceFinance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ currency: z.enum(workspaceCurrencies), admin: z.boolean().default(false) }).parse(input))
  .handler(async ({ context, data }) => {
    let client = context.supabase;
    if (data.admin) {
      const { data: allowed, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
      if (error || !allowed) throw new Error("Acesso reservado à administração");
      client = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    }
    let nationalQuery = client.from("transactions").select("id,user_id,product_id,amount_mzn,fee_mzn,net_mzn,status,is_test,created_at,method,customer_name,customer_phone,customer_email,external_ref");
    let internationalQuery = client.from("international_payments").select("id,user_id,product_id,reference,provider,currency,amount_minor,fee_minor,status,created_at,customer_name,customer_email");
    if (!data.admin) { nationalQuery = nationalQuery.eq("user_id", context.userId); internationalQuery = internationalQuery.eq("user_id", context.userId); }
    async function readAll<T>(query: { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }> }) {
      const rows: T[] = [];
      for (let offset = 0; ; offset += 1000) { const result = await query.range(offset, offset + 999); if (result.error) throw new Error("Não foi possível carregar o histórico financeiro"); rows.push(...(result.data ?? [])); if ((result.data?.length ?? 0) < 1000) break; }
      return { data: rows, error: null };
    }
    let withdrawalQuery = client.from("withdrawals").select("id,amount_mzn,status,created_at").eq("status", "approved");
    if (!data.admin) withdrawalQuery = withdrawalQuery.eq("user_id", context.userId);
    const [national, international, profile, withdrawals] = await Promise.all([
      data.currency === "MZN" ? readAll(nationalQuery.order("created_at", { ascending: false }).order("id")) : Promise.resolve({ data: [], error: null }),
      data.currency !== "MZN" ? readAll(internationalQuery.eq("currency", data.currency).order("created_at", { ascending: false }).order("id")) : Promise.resolve({ data: [], error: null }),
      context.supabase.from("profiles").select("balance_mzn,full_name,business_name").eq("id", context.userId).maybeSingle(),
      data.currency === "MZN" ? readAll(withdrawalQuery.order("created_at", { ascending: false }).order("id")) : Promise.resolve({ data: [], error: null }),
    ]);
    if (national.error || international.error || profile.error || withdrawals.error) throw new Error("Não foi possível carregar os pagamentos desta moeda");
    const payments: WorkspacePayment[] = [
      ...(national.data ?? []).map(row => ({ id: row.id, user_id: row.user_id, product_id: row.product_id, currency: "MZN" as WorkspaceCurrency, amount: Number(row.amount_mzn), fee: Number(row.fee_mzn ?? 0), net: Number(row.net_mzn ?? 0), status: row.is_test && row.status === "paid" ? "test_paid" : row.status, created_at: row.created_at, method: row.method, customer_name: row.customer_name, customer_email: row.customer_email, customer_phone: row.customer_phone, external_ref: row.external_ref, provider: "national" })),
      ...(international.data ?? []).map(row => ({ id: row.id, user_id: row.user_id, product_id: row.product_id, currency: row.currency as WorkspaceCurrency, amount: Number(row.amount_minor) / 100, fee: Number(row.fee_minor) / 100, net: (Number(row.amount_minor) - Number(row.fee_minor)) / 100, status: row.status, created_at: row.created_at, method: "card", customer_name: row.customer_name, customer_phone: null, customer_email: row.customer_email, external_ref: row.reference, provider: row.provider })),
    ];
    const rows = currencyPayments(payments, data.currency);
    const totals = paymentTotals(rows);
    return { outgoing: data.currency === "MZN" ? (withdrawals.data ?? []).map(row => ({ id: row.id, amount: Number(row.amount_mzn), created_at: row.created_at })) : null, currency: data.currency, payments: rows, totals, profile: profile.data, balance: data.currency === "MZN" ? Number(profile.data?.balance_mzn ?? 0) : null, providerReceipts: data.currency === "MZN" ? null : totals.volume };
  });