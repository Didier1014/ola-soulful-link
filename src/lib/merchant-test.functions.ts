// @ts-nocheck
// Teste C2B disponível para qualquer dono de merchant.
// Verifica ownership; chama sempre a RLX real (sem sandbox simulado).
// Telefone passado tal como recebido — validação delegada à RLX.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcSplit, MIN_AMOUNT, type SplitMethod } from "@/lib/split";

export const runMerchantTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    merchant_id: z.string().uuid(),
    payer_phone: z.string().min(1),
    payer_name: z.string().trim().min(1).max(120).default("Teste Merchant"),
    amount: z.number().min(MIN_AMOUNT),
    method: z.enum(["mpesa", "emola"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: merchant, error } = await supabaseAdmin
      .from("merchants").select("*").eq("id", data.merchant_id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!merchant) throw new Error("Merchant não encontrado");

    if (merchant.owner_id !== context.userId) {
      const { data: isAdmin } = await context.supabase
        .rpc("has_role", { _user_id: context.userId, _role: "admin" });
      if (!isAdmin) throw new Error("Sem permissão para testar este merchant");
    }
    if (!merchant.active) throw new Error("Merchant inactivo — activa antes de testar");

    const method = data.method as SplitMethod;
    const split = calcSplit(data.amount, method);
    const merchantPhone = method === "mpesa"
      ? (merchant.payout_mpesa || merchant.payout_emola)
      : (merchant.payout_emola || merchant.payout_mpesa);
    if (!merchantPhone) throw new Error("Merchant sem número de payout configurado");

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

    try {
      const { rlxPay, mapRlxStatus } = await import("@/lib/rlx.server");
      const { http, data: resp } = await rlxPay({
        phone: data.payer_phone,
        amount: split.gross,
        nome_cliente: data.payer_name,
        payout_phone_mpesa: method === "mpesa" ? merchantPhone : undefined,
        payout_phone_emola: method === "emola" ? merchantPhone : undefined,
      });
      const mapped = mapRlxStatus(resp?.status);
      const finalStatus = http >= 400 || mapped === "failed" ? "failed" : mapped === "paid" ? "success" : "pending";

      await supabaseAdmin.from("merchant_transactions").update({
        status: finalStatus,
        rlx_txid: resp?.txid ? String(resp.txid) : null,
        rlx_response: resp ?? null,
      }).eq("id", logRow.id);

      if (finalStatus === "failed") {
        const rlxError = resp?.error ?? resp?.message ?? "Pagamento recusado pela RLX";
        throw new Error(rlxError);
      }

      return {
        status: finalStatus, http, split, merchant_phone: merchantPhone,
        partner_transaction_id: resp?.txid ?? null, rlx_response: resp,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha ao contactar RLX";
      await supabaseAdmin.from("merchant_transactions").update({
        status: "failed", rlx_response: { error: message },
      }).eq("id", logRow.id);
      throw new Error(message);
    }
  });
