// @ts-nocheck
// Teste C2B disponível para qualquer dono de merchant.
// Verifica ownership, marca a transacção como is_test=true.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcSplit, MIN_AMOUNT, type SplitMethod } from "@/lib/split";

function normalizePhone(input: string): string | null {
  const d = String(input || "").replace(/\D/g, "");
  const local = d.startsWith("258") ? d.slice(3) : d;
  return /^\d{9}$/.test(local) ? local : null;
}

export const runMerchantTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    merchant_id: z.string().uuid(),
    payer_phone: z.string(),
    payer_name: z.string().trim().min(1).max(120).default("Teste Merchant"),
    amount: z.number().min(MIN_AMOUNT),
    method: z.enum(["mpesa", "emola"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const phone = normalizePhone(data.payer_phone);
    if (!phone) throw new Error("INVALID_PHONE: telefone deve ter 9 dígitos (com ou sem +258)");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: merchant, error } = await supabaseAdmin
      .from("merchants").select("*").eq("id", data.merchant_id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!merchant) throw new Error("Merchant não encontrado");

    // ownership: dono OU admin
    if (merchant.owner_id !== context.userId) {
      const { data: isAdmin } = await context.supabase
        .rpc("has_role", { _user_id: context.userId, _role: "admin" });
      if (!isAdmin) throw new Error("Sem permissão para testar este merchant");
    }
    if (!merchant.active) throw new Error("Merchant inactivo — activa antes de testar");

    // Respeita gateway_mode: 'sandbox' simula, qualquer outro valor = live
    const { data: cfg } = await supabaseAdmin
      .from("platform_config").select("gateway_mode").eq("id", "config").maybeSingle();
    const sandbox = String(cfg?.gateway_mode ?? "").toLowerCase() === "sandbox";

    const method = data.method as SplitMethod;
    const split = calcSplit(data.amount, method);
    const merchantPhone = method === "mpesa"
      ? (merchant.payout_mpesa || merchant.payout_emola)
      : (merchant.payout_emola || merchant.payout_mpesa);
    if (!merchantPhone) throw new Error("Merchant sem número de payout configurado");

    const { data: logRow } = await supabaseAdmin.from("merchant_transactions").insert({
      merchant_id: merchant.id,
      owner_id: merchant.owner_id,
      payer_phone: phone,
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

    if (sandbox) {
      await supabaseAdmin.from("merchant_transactions").update({
        status: "success",
        rlx_txid: `sandbox_${logRow.id}`,
        rlx_response: { sandbox: true, simulated: true },
      }).eq("id", logRow.id);
      return {
        status: "success", sandbox: true, http: 200, split,
        merchant_phone: merchantPhone,
        partner_transaction_id: `sandbox_${logRow.id}`,
        rlx_response: { sandbox: true, simulated: true },
      };
    }

    try {
      const { rlxPay, mapRlxStatus } = await import("@/lib/rlx.server");
      const { http, data: resp } = await rlxPay({
        phone,
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

