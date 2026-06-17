// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const webhookSchema = z.object({
  event: z.coerce.string().optional().default(""),
  txid: z.coerce.string().optional().default(""),
  partner_transaction_id: z.coerce.string().optional().default(""),
  status: z.coerce.string().optional().default(""),
  valor_bruto: z.number().optional(),
  valor_liquido: z.number().optional(),
  taxa_rlx: z.number().optional(),
  canal: z.string().optional(),
  pagador: z.string().optional(),
  nome_pagador: z.string().optional(),
});

function stripPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("258") ? d.slice(3) : d;
}

export const Route = createFileRoute("/api/public/webhook-payment")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify({ status: "ok", message: "Webhook endpoint activo" }), {
          headers: { "Content-Type": "application/json" },
        });
      },
      POST: async ({ request }) => {
        const token = process.env.RLX_API_TOKEN;
        const auth = request.headers.get("authorization") ?? "";
        if (token && auth && !auth.includes(token)) {
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: z.infer<typeof webhookSchema>;
        try {
          const body = await request.json();
          payload = webhookSchema.parse(body);
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const url = new URL(request.url);
        const txIdFromUrl = url.searchParams.get("tx_id");
        let { data: tx } = txIdFromUrl
          ? await supabaseAdmin.from("transactions").select("*").eq("id", txIdFromUrl).maybeSingle()
          : { data: null };

        if (!tx) {
          const result = await supabaseAdmin
            .from("transactions")
            .select("*")
            .eq("external_ref", payload.txid || payload.partner_transaction_id)
            .maybeSingle();
          tx = result.data;
        }

        if (!tx) {
          const txidDigits = payload.txid.replace(/\D/g, "");
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

        if (!tx) return new Response("ok");

        const next =
          payload.status === "success" || payload.status === "paid" || payload.event === "payment.success"
            ? "paid"
            : payload.status === "failed" || payload.event === "payment.failed"
            ? "failed"
            : "pending";

        if (next !== tx.status) {
          const updates: Record<string, unknown> = { status: next };
          if (!tx.external_ref) updates.external_ref = payload.txid || payload.partner_transaction_id;

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

            let currency = "MZN";
            try {
              const { data: user } = await supabaseAdmin.auth.admin.getUserById(tx.user_id);
              const meta = user?.user?.user_metadata ?? {};
              if (meta.currency) currency = String(meta.currency);
            } catch {}

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

            // Read merchant integration bundle (utmify, lowtrack via legacy)
            const { data: bundle } = await supabaseAdmin
              .from("integration_settings")
              .select("utmify")
              .eq("user_id", tx.user_id)
              .eq("integration_key", "_bundle")
              .maybeSingle();

            const { error: notificationError } = await supabaseAdmin.from("notifications").insert({
              user_id: tx.user_id,
              type: "sale",
              title: "Nova venda",
              message: `Pagamento de ${Number(tx.amount_mzn).toLocaleString("pt-MZ", { style: "currency", currency })} recebido`,
              data: {
                transaction_id: tx.id,
                amount_mzn: Number(tx.amount_mzn),
                currency,
                customer_name: tx.customer_name ?? null,
                product_name: productName,
              },
            });
            if (notificationError) console.error("[webhook] notification insert failed:", notificationError.message);

            try {
              const { sendPushToUser } = await import("@/lib/push.functions");
              const formattedAmount = Number(tx.amount_mzn).toLocaleString("pt-MZ", { style: "currency", currency });
              const pushRes = await sendPushToUser(
                supabaseAdmin, tx.user_id,
                "Nova venda!",
                `${formattedAmount} — ${tx.customer_name || "Cliente"}${productName ? ` — ${productName}` : ""}`,
                "/dashboard/transactions",
              );
              if (!pushRes.ok) console.log("[webhook] push not sent:", pushRes.reason);
            } catch (err: any) {
              console.error("[webhook] push send failed:", err?.message || err);
            }

            // Send "Sale approved" email to the producer
            try {
              const React = await import("react");
              const { render } = await import("@react-email/components");
              const { template: saleTpl } = await import("@/lib/email-templates/sale-confirmation");
              const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(tx.user_id);
              const producerEmail = userRes?.user?.email;
              const producerName = (userRes?.user?.user_metadata as any)?.full_name || "Produtor";
              if (producerEmail) {
                const formattedAmount = Number(tx.amount_mzn).toLocaleString("pt-MZ", { style: "currency", currency });
                const formattedNet = Number(sellerNet).toLocaleString("pt-MZ", { style: "currency", currency });
                const data = {
                  producerName,
                  customerName: tx.customer_name || "Cliente",
                  customerPhone: tx.customer_phone || "",
                  productName: productName || "",
                  amount: formattedAmount,
                  netAmount: formattedNet,
                  transactionId: tx.id,
                  date: new Date().toLocaleString("pt-MZ"),
                };
                const element = React.createElement(saleTpl.component as any, data);
                const html = await render(element);
                const text = await render(element, { plainText: true });
                const subject = typeof saleTpl.subject === "function" ? saleTpl.subject(data) : saleTpl.subject;
                const messageId = crypto.randomUUID();
                await supabaseAdmin.from("email_send_log").insert({
                  message_id: messageId,
                  template_name: "sale-confirmation",
                  recipient_email: producerEmail,
                  status: "pending",
                });
                await supabaseAdmin.rpc("enqueue_email", {
                  queue_name: "transactional_emails",
                  payload: {
                    message_id: messageId,
                    to: producerEmail,
                    from: "RedoxPay <noreply@notify.www.redoxpay.site>",
                    sender_domain: "notify.www.redoxpay.site",
                    subject,
                    html,
                    text,
                    purpose: "transactional",
                    label: "sale-confirmation",
                    idempotency_key: `sale-${tx.id}`,
                    queued_at: new Date().toISOString(),
                  },
                });
              }
            } catch (err: any) {
              console.error("[webhook] sale email failed:", err?.message || err);
            }


            try {
              const { data: utmifyCfg } = await supabaseAdmin
                .from("integration_settings")
                .select("settings")
                .eq("user_id", tx.user_id)
                .eq("integration_key", "utimify")
                .maybeSingle();
              const utmifyToken = utmifyCfg?.settings?.api_token as string | undefined;
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

            try {
              const { data: lowtrackCfg } = await supabaseAdmin
                .from("integration_settings")
                .select("settings")
                .eq("user_id", tx.user_id)
                .eq("integration_key", "lowtrack")
                .maybeSingle();
              const lowtrackUrl = lowtrackCfg?.settings?.webhook_url as string | undefined;
              if (lowtrackUrl) {
                fetch(lowtrackUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event: "payment.confirmed",
                    orderId: tx.id,
                    amount: Number(tx.amount_mzn),
                    netAmount: Number(tx.net_mzn),
                    customer: { name: tx.customer_name, phone: tx.customer_phone },
                    product: productName,
                    createdAt: tx.created_at,
                  }),
                }).catch(() => {});
              }
            } catch {}
          }
        }
        return new Response("ok");
      },
    },
  },
});