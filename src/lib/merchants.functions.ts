// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcSplit, MIN_AMOUNT, type SplitMethod } from "@/lib/split";

const phoneMpesa = z.string().regex(/^8[45]\d{7}$/, "M-Pesa inválido (84/85 + 7 dígitos)");
const phoneEmola = z.string().regex(/^8[67]\d{7}$/, "E-Mola inválido (86/87 + 7 dígitos)");

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  payout_mpesa: z.string().trim().optional().or(z.literal("")),
  payout_emola: z.string().trim().optional().or(z.literal("")),
}).superRefine((v, ctx) => {
  if (!v.payout_mpesa && !v.payout_emola) {
    ctx.addIssue({ code: "custom", message: "Indica pelo menos um número (M-Pesa ou E-Mola)", path: ["payout_mpesa"] });
  }
  if (v.payout_mpesa && !phoneMpesa.safeParse(v.payout_mpesa).success) {
    ctx.addIssue({ code: "custom", message: "M-Pesa inválido (84/85 + 7 dígitos)", path: ["payout_mpesa"] });
  }
  if (v.payout_emola && !phoneEmola.safeParse(v.payout_emola).success) {
    ctx.addIssue({ code: "custom", message: "E-Mola inválido (86/87 + 7 dígitos)", path: ["payout_emola"] });
  }
});

export const listMerchants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("merchants").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMerchant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: merchant, error } = await context.supabase
      .from("merchants").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!merchant) throw new Error("Merchant não encontrado");
    const { data: txs } = await context.supabase
      .from("merchant_transactions").select("*").eq("merchant_id", data.id)
      .order("created_at", { ascending: false }).limit(50);
    return { merchant, transactions: txs ?? [] };
  });

export const createMerchant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("merchants").insert({
      owner_id: context.userId,
      name: data.name,
      email: data.email || null,
      payout_mpesa: data.payout_mpesa || null,
      payout_emola: data.payout_emola || null,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMerchant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().max(160).optional().or(z.literal("")),
    payout_mpesa: z.string().trim().optional().or(z.literal("")),
    payout_emola: z.string().trim().optional().or(z.literal("")),
    active: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.email !== undefined) patch.email = data.email || null;
    if (data.payout_mpesa !== undefined) patch.payout_mpesa = data.payout_mpesa || null;
    if (data.payout_emola !== undefined) patch.payout_emola = data.payout_emola || null;
    if (data.active !== undefined) patch.active = data.active;
    const { data: row, error } = await context.supabase
      .from("merchants").update(patch).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMerchant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("merchants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeMerchantApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { randomBytes } = await import("crypto");
    const apiKey = "mrc_live_" + randomBytes(24).toString("hex");
    const { data: row, error } = await context.supabase
      .from("merchants").update({ api_key: apiKey }).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Merchant não encontrado");
    return row;
  });

// Processa pagamento com split via RLX.
export const processMerchantPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    merchant_id: z.string().uuid(),
    payer_phone: z.string().trim().regex(/^\+?\d{8,15}$/, "Telefone do pagador inválido"),
    payer_name: z.string().trim().min(2).max(120).default("Cliente"),
    amount: z.number().min(MIN_AMOUNT, `Valor mínimo é ${MIN_AMOUNT} MT`).max(1_000_000),
    method: z.enum(["mpesa", "emola"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: merchant, error } = await context.supabase
      .from("merchants").select("*").eq("id", data.merchant_id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!merchant) throw new Error("Merchant não encontrado");
    if (!merchant.active) throw new Error("Merchant está inactivo");

    const method = data.method as SplitMethod;
    const split = calcSplit(data.amount, method);

    // Escolhe número do merchant pelo método, com fallback
    const merchantPhone =
      method === "mpesa"
        ? (merchant.payout_mpesa || merchant.payout_emola)
        : (merchant.payout_emola || merchant.payout_mpesa);
    if (!merchantPhone) throw new Error("Merchant sem número de payout configurado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Insere log pending
    const { data: logRow } = await supabaseAdmin.from("merchant_transactions").insert({
      merchant_id: merchant.id,
      owner_id: merchant.owner_id,
      payer_phone: data.payer_phone,
      method,
      gross: split.gross,
      platform_fee: split.platformFee,
      rlx_cost: split.rlxCost,
      owner_profit: split.ownerProfit,
      merchant_net: split.merchantNet,
      provider_phone: split.providerPhone,
      merchant_phone: merchantPhone,
      status: "pending",
    }).select().single();

    try {
      const { rlxPay, mapRlxStatus } = await import("@/lib/rlx.server");
      const { http, data: resp } = await rlxPay({
        phone: data.payer_phone,
        amount: split.gross,
        nome_cliente: data.payer_name,
        splits: [
          { phone: split.providerPhone, amount: split.ownerProfit },
          { phone: merchantPhone, amount: split.merchantNet },
        ],
      });

      const status = mapRlxStatus(resp?.status);
      const finalStatus = http >= 400 || status === "failed" ? "failed" : status === "paid" ? "success" : "pending";

      await supabaseAdmin.from("merchant_transactions").update({
        status: finalStatus,
        rlx_txid: resp?.txid ? String(resp.txid) : null,
        rlx_response: resp ?? null,
      }).eq("id", logRow.id);

      return {
        id: logRow.id,
        status: finalStatus,
        split,
        merchantPhone,
        message: resp?.message ?? resp?.error ?? null,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha ao contactar RLX";
      await supabaseAdmin.from("merchant_transactions").update({
        status: "pending",
        rlx_response: { error: message },
      }).eq("id", logRow.id);
      return { id: logRow.id, status: "pending", split, merchantPhone, message };
    }
  });
