// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcSplit, MIN_AMOUNT, type SplitMethod } from "@/lib/split";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase
    .rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Acesso restrito a administradores");
}

export const runAdminTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    merchant_id: z.string().uuid().optional(),
    payer_phone: z.string().regex(/^\+?\d{8,15}$/),
    payer_name: z.string().trim().min(1).max(120).default("Teste Admin"),
    amount: z.number().min(MIN_AMOUNT),
    method: z.enum(["mpesa", "emola"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg } = await supabaseAdmin
      .from("platform_config").select("*").eq("id", "config").maybeSingle();
    const mode = (cfg?.test_mode ?? "merchant") as "merchant" | "general";

    const method = data.method as SplitMethod;
    const { rlxPay, mapRlxStatus } = await import("@/lib/rlx.server");

    if (mode === "merchant") {
      if (!data.merchant_id) throw new Error("Selecciona um merchant para testar em modo 'Via Merchant'");
      const { data: merchant, error } = await supabaseAdmin
        .from("merchants").select("*").eq("id", data.merchant_id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!merchant) throw new Error("Merchant não encontrado");
      if (!merchant.active) throw new Error("Merchant inactivo");

      const split = calcSplit(data.amount, method);
      const merchantPhone = method === "mpesa"
        ? (merchant.payout_mpesa || merchant.payout_emola)
        : (merchant.payout_emola || merchant.payout_mpesa);
      if (!merchantPhone) throw new Error("Merchant sem número de payout");

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
        is_test: true,
      }).select().single();

      const { http, data: resp } = await rlxPay({
        phone: data.payer_phone,
        amount: split.gross,
        nome_cliente: data.payer_name,
        splits: [
          { phone: split.providerPhone, amount: split.ownerProfit },
          { phone: merchantPhone, amount: split.merchantNet },
        ],
      });
      const mapped = mapRlxStatus(resp?.status);
      const finalStatus = http >= 400 || mapped === "failed" ? "failed" : mapped === "paid" ? "success" : "pending";
      await supabaseAdmin.from("merchant_transactions").update({
        status: finalStatus,
        rlx_txid: resp?.txid ? String(resp.txid) : null,
        rlx_response: resp ?? null,
      }).eq("id", logRow.id);

      return {
        mode, status: finalStatus, http, split, merchant_phone: merchantPhone,
        partner_transaction_id: resp?.txid ?? null, rlx_response: resp,
        merchant: { id: merchant.id, name: merchant.name, client_id: merchant.client_id },
      };
    }

    // mode === 'general' — chama directamente a RLX com payout da plataforma
    const platformPhone = method === "mpesa"
      ? (cfg?.profit_payout_mpesa || cfg?.profit_payout_emola)
      : (cfg?.profit_payout_emola || cfg?.profit_payout_mpesa);
    if (!platformPhone) throw new Error("Configura os payouts da plataforma em Configurações");

    const { http, data: resp } = await rlxPay({
      phone: data.payer_phone,
      amount: data.amount,
      nome_cliente: data.payer_name,
      payout_phone_mpesa: method === "mpesa" ? platformPhone : undefined,
      payout_phone_emola: method === "emola" ? platformPhone : undefined,
    });
    return {
      mode, http, status: mapRlxStatus(resp?.status),
      partner_transaction_id: resp?.txid ?? null, rlx_response: resp,
      payout_phone: platformPhone,
    };
  });
