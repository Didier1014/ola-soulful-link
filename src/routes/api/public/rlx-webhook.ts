// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const webhookSchema = z.object({
  event: z.coerce.string().optional().default(""),
  txid: z.coerce.string().optional().default(""),
  status: z.coerce.string().optional().default(""),
  valor_bruto: z.number().optional(),
  valor_liquido: z.number().optional(),
  taxa_rlx: z.number().optional(),
  canal: z.string().optional(),
  pagador: z.string().optional(),
  nome_pagador: z.string().optional(),
}).passthrough();

function stripPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("258") ? d.slice(3) : d;
}

async function parseWebhookBody(request: Request) {
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams);
  const raw = await request.text().catch(() => "");
  if (!raw) return queryParams;
  try { return { ...queryParams, ...JSON.parse(raw) }; } catch { /* not json */ }
  return { ...queryParams, ...Object.fromEntries(new URLSearchParams(raw)) };
}

function mapGatewayStatus(payload: Record<string, unknown>) {
  const text = [payload.status, payload.event, payload.estado, payload.state, payload.message, payload.msg]
    .filter(Boolean)
    .map(String)
    .join(" ")
    .toLowerCase();
  if (/success|paid|completed|approved|confirm|confirmado|aprovad|pago/.test(text)) return "paid";
  if (/failed|error|cancel|reject|rejeitad|expirad|falh/.test(text)) return "failed";
  return "pending";
}

async function processWebhook(request: Request) {
        const token = process.env.RLX_API_TOKEN;
        const auth = request.headers.get("authorization") ?? "";
        if (token && auth && !auth.includes(token)) {
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: z.infer<typeof webhookSchema>;
        try {
          const body = await parseWebhookBody(request);
          console.log("[RLX webhook] ←", JSON.stringify(body).slice(0, 400));
          payload = webhookSchema.parse(body);
        } catch (e) {
          console.log("[RLX webhook] parse error", e);
          return new Response("Invalid payload", { status: 400 });
        }
        const externalRef = String(payload.txid || payload.transaction_id || payload.partner_transaction_id || payload.reference || payload.ref || payload.id || "");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Priority 1: match by tx_id from webhook URL query parameter
        const url = new URL(request.url);
        const txIdFromUrl = url.searchParams.get("tx_id");
        let { data: tx } = txIdFromUrl
          ? await supabaseAdmin.from("transactions").select("*").eq("id", txIdFromUrl).maybeSingle()
          : { data: null };

        // Priority 2: match by external_ref
        if (!tx) {
          const result = await supabaseAdmin
            .from("transactions")
            .select("*")
            .eq("external_ref", externalRef)
            .maybeSingle();
          tx = result.data;
        }

        // Priority 3: fallback — match by normalised phone for pending transactions
        if (!tx) {
          const txidDigits = externalRef.replace(/\D/g, "");
          const { data: candidates } = await supabaseAdmin
            .from("transactions")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: false });
          if (candidates) {
            tx = candidates.find((c) => {
              const cPhone = stripPhone(c.customer_phone ?? "");
              return cPhone === txidDigits || cPhone === stripPhone(txidDigits);
            }) ?? null;
          }
        }

        if (!tx) {
          console.log(`[RLX webhook] tx not found external_ref=${externalRef || "-"} tx_id=${txIdFromUrl || "-"}`);
          return new Response("ok"); // ignore unknown txids
        }

        const next = mapGatewayStatus(payload);
        console.log(`[RLX webhook][sale:${tx.id}] matched status=${tx.status} next=${next} external_ref=${externalRef || tx.external_ref || "-"}`);

        if (externalRef && tx.external_ref !== externalRef) {
          await supabaseAdmin.from("transactions").update({ external_ref: externalRef }).eq("id", tx.id);
          tx.external_ref = externalRef;
        }

        if (next !== tx.status) {
          const updates: Record<string, unknown> = { status: next };
          if (!tx.external_ref && externalRef) updates.external_ref = externalRef;

          if (next === "paid") {
            const amount = Number(tx.amount_mzn) || 0;
            const sellerFee = Math.round((amount * 0.15 + 15) * 100) / 100;
            const sellerNet = Math.round((amount - sellerFee) * 100) / 100;
            updates.net_mzn = sellerNet;

            const { data: changed } = await supabaseAdmin
              .from("transactions")
              .update(updates)
              .eq("id", tx.id)
              .eq("status", "pending")
              .select("id")
              .maybeSingle();
            if (!changed) return new Response("ok");

            const { data: prof } = await supabaseAdmin
              .from("profiles").select("balance_mzn").eq("id", tx.user_id).maybeSingle();
            await supabaseAdmin.from("profiles")
              .update({ balance_mzn: Number(prof?.balance_mzn ?? 0) + sellerNet })
              .eq("id", tx.user_id);

            try {
              console.log(`[RLX webhook][sale:${tx.id}] payment marked paid; dispatching sale side-effects`);
              const { notifyNewSale } = await import("@/lib/sale-notify.server");
              await notifyNewSale(supabaseAdmin, tx.id);
              console.log(`[RLX webhook][sale:${tx.id}] sale side-effects finished`);
            } catch (e) {
              console.log(`[RLX webhook][sale:${tx.id}] notifyNewSale failed`, e);
            }
          } else if (next !== "pending") {
            const { error: statusErr } = await supabaseAdmin
              .from("transactions")
              .update(updates)
              .eq("id", tx.id);
            if (statusErr) console.log(`[RLX webhook][sale:${tx.id}] status update failed`, statusErr.message);
          }

        } else if (next === "paid") {
          try {
            console.log(`[RLX webhook][sale:${tx.id}] already paid; ensuring sale side-effects`);
            const { notifyNewSale } = await import("@/lib/sale-notify.server");
            await notifyNewSale(supabaseAdmin, tx.id);
          } catch (e) {
            console.log(`[RLX webhook][sale:${tx.id}] notifyNewSale retry failed`, e);
          }
        }
        return new Response("ok");
}

export const Route = createFileRoute("/api/public/rlx-webhook")({
  server: {
    handlers: {
      GET: ({ request }) => processWebhook(request),
      POST: ({ request }) => processWebhook(request),
    },
  },
});