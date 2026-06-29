// Endpoint público para merchants — valida api_key e executa split.
// Authorization: Bearer mrc_live_xxx
// Body JSON: { client_id, payer_phone, payer_name?, amount, method: 'mpesa'|'emola', is_test? }
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { calcSplit, MIN_AMOUNT, type SplitMethod } from "@/lib/split";

const bodySchema = z.object({
  client_id: z.string().optional(),
  payer_phone: z.string().regex(/^\+?\d{8,15}$/),
  payer_name: z.string().trim().min(1).max(120).default("Cliente"),
  amount: z.number().min(MIN_AMOUNT),
  method: z.enum(["mpesa", "emola"]),
  is_test: z.boolean().optional().default(false),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export const Route = createFileRoute("/api/public/pay")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
        },
      }),
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const apiKey = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
        if (!apiKey || !apiKey.startsWith("mrc_live_")) {
          return json({ error: "API key inválida ou em falta" }, 401);
        }

        let raw: unknown;
        try { raw = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) return json({ error: "Pedido inválido", details: parsed.error.format() }, 400);
        const body = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: merchant, error } = await supabaseAdmin
          .from("merchants").select("*").eq("api_key", apiKey).maybeSingle();
        if (error) return json({ error: "Erro ao validar merchant" }, 500);
        if (!merchant) return json({ error: "API key não reconhecida" }, 401);
        if (body.client_id && merchant.client_id !== body.client_id) {
          return json({ error: "client_id não corresponde ao merchant" }, 401);
        }
        if (!merchant.active) return json({ error: "Merchant inactivo" }, 403);

        const method = body.method as SplitMethod;
        const split = calcSplit(body.amount, method);

        const merchantPhone = method === "mpesa"
          ? (merchant.payout_mpesa || merchant.payout_emola)
          : (merchant.payout_emola || merchant.payout_mpesa);
        if (!merchantPhone) return json({ error: "Merchant sem número de payout" }, 400);

        const { data: logRow } = await supabaseAdmin.from("merchant_transactions").insert({
          merchant_id: merchant.id,
          owner_id: merchant.owner_id,
          payer_phone: body.payer_phone,
          method,
          gross: split.gross,
          platform_fee: split.platformFee,
          rlx_cost: split.rlxCost,
          owner_profit: split.ownerProfit,
          merchant_net: split.merchantNet,
          provider_phone: split.providerPhone,
          merchant_phone: merchantPhone,
          status: "pending",
          is_test: body.is_test,
        }).select().single();

        try {
          const { rlxPay, mapRlxStatus } = await import("@/lib/rlx.server");
          const { http, data: resp } = await rlxPay({
            phone: body.payer_phone,
            amount: split.gross,
            nome_cliente: body.payer_name,
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

          return json({
            id: logRow.id,
            status: finalStatus,
            partner_transaction_id: resp?.txid ?? null,
            split,
            merchant_phone: merchantPhone,
            rlx_http: http,
            rlx_response: resp ?? null,
            is_test: body.is_test,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Falha ao contactar RLX";
          await supabaseAdmin.from("merchant_transactions").update({
            status: "failed",
            rlx_response: { error: message },
          }).eq("id", logRow.id);
          return json({ id: logRow.id, status: "failed", error: message, split }, 502);
        }
      },
    },
  },
});
