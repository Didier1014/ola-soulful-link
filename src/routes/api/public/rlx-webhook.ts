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

        if (!tx) return new Response("ok"); // ignore unknown txids

        const next = mapGatewayStatus(payload);

        if (externalRef && tx.external_ref !== externalRef) {
          await supabaseAdmin.from("transactions").update({ external_ref: externalRef }).eq("id", tx.id);
          tx.external_ref = externalRef;
        }

        if (next !== tx.status) {
          const updates: Record<string, unknown> = { status: next };
          if (!tx.external_ref && externalRef) updates.external_ref = externalRef;

          if (next === "paid") {
            const amount = Number(tx.amount_mzn) || 0;
            // Seller pays 15% + 15 MT; RLX costs 12% + 12 MT (from webhook or calculated)
            const sellerFee = Math.round((amount * 0.15 + 15) * 100) / 100;
            const rlxCost = Math.round((amount * 0.10 + 10) * 100) / 100;
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

            // Read the merchant's preferences from user_metadata
            let currency = "MZN";
            let notificationsEnabled = true;
            try {
              const { data: user } = await supabaseAdmin.auth.admin.getUserById(tx.user_id);
              const meta = user?.user?.user_metadata ?? {};
              if (meta.currency) currency = String(meta.currency);
              if (meta.notifications_enabled === false) notificationsEnabled = false;
            } catch {}

            // Read merchant integration bundle (push_custom, pushcut, utmify, mozesms)
            const { data: bundle } = await supabaseAdmin
              .from("integration_settings")
              .select("push_custom, pushcut, utmify, mozesms")
              .eq("user_id", tx.user_id)
              .eq("integration_key", "_bundle")
              .maybeSingle();

            let productName: string | null = null;
            let productUtmifyId: string | null = null;
            let productLowtrackId: string | null = null;
            if (tx.product_id) {
              const { data: prod } = await supabaseAdmin
                .from("products").select("name,utimify_id,lawtracker_id").eq("id", tx.product_id).maybeSingle();
              productName = prod?.name ?? null;
              productUtmifyId = prod?.utimify_id ?? null;
              productLowtrackId = prod?.lawtracker_id ?? null;
            }

            if (notificationsEnabled) {


              // Format value in chosen currency from push_custom override (fallback to user meta currency)
              const pushCurrency = (bundle?.push_custom?.currency as string) || currency;
              const formattedAmount = Number(tx.amount_mzn).toLocaleString("pt-MZ", { style: "currency", currency: pushCurrency });
              const fillVars = (s: string) => s
                .replaceAll("{valor}", formattedAmount)
                .replaceAll("{produto}", productName ?? "")
                .replaceAll("{cliente}", tx.customer_name ?? "Cliente");

              const customTitle = (bundle?.push_custom?.title as string) || "💰 Nova venda aprovada!";
              const customBody = (bundle?.push_custom?.body as string) || `{valor} — {cliente}`;

              const { error: notificationError } = await supabaseAdmin.from("notifications").insert({
                user_id: tx.user_id,
                type: "sale",
                title: fillVars(customTitle),
                message: fillVars(customBody),
                data: {
                  transaction_id: tx.id,
                  amount_mzn: Number(tx.amount_mzn),
                  currency: pushCurrency,
                  customer_name: tx.customer_name ?? null,
                  product_name: productName,
                },
              });
              if (notificationError) console.error("[webhook] notification insert failed:", notificationError.message);

              // 📲 Send PWA push notification
              const { sendPushToUser } = await import("@/lib/push.functions");
              sendPushToUser(
                supabaseAdmin, tx.user_id,
                fillVars(customTitle),
                fillVars(customBody),
                "/dashboard/transactions",
              ).catch(() => {});

              // 📱 PUSHcut webhook
              const pushcutUrl = bundle?.pushcut?.enabled ? (bundle?.pushcut?.webhook_url as string) : null;
              if (pushcutUrl) {
                fetch(pushcutUrl, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ title: fillVars(customTitle), text: fillVars(customBody), input: String(tx.id) }),
                }).catch(() => {});
              }

              // 📨 MozeSMS para o cliente
              const sms = bundle?.mozesms;
              if (sms?.enabled && tx.customer_phone && sms?.template) {
                const msg = String(sms.template)
                  .replaceAll("{nome}", tx.customer_name ?? "Cliente")
                  .replaceAll("{produto}", productName ?? "")
                  .replaceAll("{valor}", formattedAmount)
                  .replaceAll("{email}", tx.customer_email ?? "");
                await supabaseAdmin.from("sms_logs").insert({
                  phone: tx.customer_phone, message: `[${sms.sender_id || "RedoxPay"}] ${msg}`, status: "queued",
                  user_id: tx.user_id, transaction_id: tx.id,
                } as any).catch(() => {});

              }
            }


            // 🔗 Send sale data to Utmify (new bundle takes precedence, legacy key as fallback)
            try {
              let utmifyToken = bundle?.utmify?.enabled ? (bundle?.utmify?.api_token as string | undefined) : undefined;
              if (!utmifyToken) {
                const { data: utmifyCfg } = await supabaseAdmin
                  .from("integration_settings")
                  .select("settings")
                  .eq("user_id", tx.user_id)
                  .eq("integration_key", "utimify")
                  .maybeSingle();
                utmifyToken = utmifyCfg?.settings?.api_token as string | undefined;
              }
              if (utmifyToken) {

                const body = {
                  status: "paid",
                  orderId: tx.id,
                  customer: {
                    name: tx.customer_name ?? "",
                    phone: tx.customer_phone ?? "",
                  },
                  products: productName
                    ? [{ id: productUtmifyId ?? "", name: productName, quantity: 1, priceInCents: Math.round(Number(tx.amount_mzn) * 100) }]
                    : [],
                  createdAt: tx.created_at,
                };
                fetch("https://api.utmify.com.br/api-credentials/orders", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "x-api-token": utmifyToken },
                  body: JSON.stringify(body),
                }).catch(() => {});
              }
            } catch {}

            // 🔗 Send sale data to LowTrack (webhook)
            try {
              const { data: lowtrackCfg } = await supabaseAdmin
                .from("integration_settings")
                .select("settings")
                .eq("user_id", tx.user_id)
                .eq("integration_key", "lowtrack")
                .maybeSingle();
              const lowtrackUrl = lowtrackCfg?.settings?.webhook_url as string | undefined;
              const lowtrackEnabled = lowtrackCfg?.settings?.enabled !== false;
              const lowtrackToken = lowtrackCfg?.settings?.api_token as string | undefined;
              if (lowtrackUrl && lowtrackEnabled) {
                const headers: Record<string, string> = { "Content-Type": "application/json" };
                if (lowtrackToken) headers["authorization"] = `Bearer ${lowtrackToken}`;

                // Append product token + sale data as querystring (LowTrack postback style)
                let finalUrl = lowtrackUrl;
                try {
                  const u = new URL(lowtrackUrl);
                  if (productLowtrackId) {
                    u.searchParams.set("token", productLowtrackId);
                    u.searchParams.set("click_id", productLowtrackId);
                  }
                  u.searchParams.set("transaction_id", String(tx.id));
                  u.searchParams.set("value", String(Number(tx.amount_mzn)));
                  u.searchParams.set("status", "paid");
                  finalUrl = u.toString();
                } catch {}

                fetch(finalUrl, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    event: "payment.confirmed",
                    token: productLowtrackId,
                    click_id: productLowtrackId,
                    orderId: tx.id,
                    transaction_id: tx.id,
                    amount: Number(tx.amount_mzn),
                    value: Number(tx.amount_mzn),
                    netAmount: Number(tx.net_mzn),
                    status: "paid",
                    customer: { name: tx.customer_name, phone: tx.customer_phone, email: tx.customer_email },
                    product: productName,
                    product_token: productLowtrackId,
                    createdAt: tx.created_at,
                  }),
                }).catch(() => {});
              }
            } catch {}
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