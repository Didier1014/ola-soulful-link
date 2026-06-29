// @ts-nocheck
// Endpoint público para merchants — valida api_key e executa split.
// Authorization: Bearer mrc_live_xxx
// Body JSON: { client_id?, payer_phone, payer_name?, amount, method: 'mpesa'|'emola' }
// (is_test NUNCA é lido do payload público — só pode ser true via fluxo interno autenticado)
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { calcSplit, MIN_AMOUNT, type SplitMethod } from "@/lib/split";

function normalizePhone(input: string): string | null {
  const digits = String(input || "").replace(/\D/g, "");
  const local = digits.startsWith("258") ? digits.slice(3) : digits;
  return /^\d{9}$/.test(local) ? local : null;
}

const bodySchema = z.object({
  client_id: z.string().optional(),
  payer_phone: z.string(),
  payer_name: z.string().trim().min(1).max(120).default("Cliente"),
  amount: z.number().min(MIN_AMOUNT),
  method: z.enum(["mpesa", "emola"]),
}).passthrough(); // ignora silenciosamente campos extra (ex: is_test do cliente)

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

        const normalized = normalizePhone(body.payer_phone);
        if (!normalized) return json({ error: "INVALID_PHONE", message: "Telefone deve ter 9 dígitos (com ou sem +258)" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: merchant, error } = await supabaseAdmin
          .from("merchants").select("*").eq("api_key", apiKey).maybeSingle();
        if (error) return json({ error: "Erro ao validar merchant" }, 500);
        if (!merchant) return json({ error: "API key não reconhecida" }, 401);
        if (body.client_id && merchant.client_id !== body.client_id) {
          return json({ error: "client_id não corresponde ao merchant" }, 401);
        }
        if (!merchant.active) return json({ error: "Merchant inactivo" }, 403);

        // Ler gateway_mode da plataforma (sandbox = simular; restante = live)
        const { data: cfg } = await supabaseAdmin
          .from("platform_config").select("gateway_mode").eq("id", "config").maybeSingle();
        const sandbox = String(cfg?.gateway_mode ?? "").toLowerCase() === "sandbox";

        const method = body.method as SplitMethod;
        const split = calcSplit(body.amount, method);

        const merchantPhone = method === "mpesa"
          ? (merchant.payout_mpesa || merchant.payout_emola)
          : (merchant.payout_emola || merchant.payout_mpesa);
        if (!merchantPhone) return json({ error: "Merchant sem número de payout" }, 400);

        const { data: logRow } = await supabaseAdmin.from("merchant_transactions").insert({
          merchant_id: merchant.id,
          owner_id: merchant.owner_id,
          payer_phone: normalized,
          method,
          gross: split.gross,
          platform_fee: split.platformFee,
          rlx_cost: split.rlxCost,
          owner_profit: split.ownerProfit,
          merchant_net: split.merchantNet,
          provider_phone: split.providerPhone,
          merchant_phone: merchantPhone,
          status: "pending",
          is_test: false,
        }).select().single();

        if (sandbox) {
          await supabaseAdmin.from("merchant_transactions").update({
            status: "success",
            rlx_txid: `sandbox_${logRow.id}`,
            rlx_response: { sandbox: true, simulated: true },
          }).eq("id", logRow.id);
          return json({
            id: logRow.id, status: "success", sandbox: true,
            partner_transaction_id: `sandbox_${logRow.id}`,
            split, merchant_phone: merchantPhone,
          });
        }

        try {
          const { rlxPay, mapRlxStatus } = await import("@/lib/rlx.server");
          const { http, data: resp } = await rlxPay({
            phone: normalized,
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
