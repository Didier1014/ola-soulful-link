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

            const { notifyNewSale } = await import("@/lib/sale-notify.server");
            await notifyNewSale(supabaseAdmin, tx.id);

            // Sale confirmation email to the producer
            try {
              const React = await import("react");
              const { render } = await import("@react-email/components");
              const { template: saleTpl } = await import("@/lib/email-templates/sale-confirmation");
              const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(tx.user_id);
              const producerEmail = userRes?.user?.email;
              const producerName = (userRes?.user?.user_metadata as any)?.full_name || "Produtor";
              let currency = "MZN";
              const metaCur = (userRes?.user?.user_metadata as any)?.currency;
              if (metaCur) currency = String(metaCur);
              let productName: string | null = null;
              if (tx.product_id) {
                const { data: prod } = await supabaseAdmin
                  .from("products").select("name").eq("id", tx.product_id).maybeSingle();
                productName = prod?.name ?? null;
              }
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
          }

        }
        return new Response("ok");
      },
    },
  },
});