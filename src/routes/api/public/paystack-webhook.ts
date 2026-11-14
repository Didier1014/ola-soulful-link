import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifiedInternationalState } from "@/lib/checkout-currency";

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: { handlers: {
    GET: () => Response.json({ service: "Redox Pay Paystack webhook", method: "POST" }),
    POST: async ({ request }) => {
      // Reject unsigned probes before checking environment configuration. They
      // are unauthorized requests, not an outage of the payment service.
      const signature = request.headers.get("x-paystack-signature");
      if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) return new Response("Invalid signature", { status: 401 });
      // The builder supplied this already-saved secret reference for Paystack;
      // connector keys are gateway credentials and cannot verify provider HMACs.
      const secret = process.env["STRIPE_LIVE_API_KEY"];
      if (!secret) return new Response("Webhook signature secret not configured", { status: 503 });
      if (Number(request.headers.get("content-length") ?? 0) > 100000) return new Response("Payload too large", { status: 413 });
      const body = await request.text();
      if (body.length > 100000) return new Response("Payload too large", { status: 413 });
      const { validPaystackSignature } = await import("@/lib/paystack-signature.server");
      if (!validPaystackSignature(body, signature, secret)) return new Response("Invalid signature", { status: 401 });
      let event;
      try { event = z.object({ event: z.string().max(100), data: z.object({ reference: z.string().max(100) }).passthrough() }).parse(JSON.parse(body)); }
      catch { return new Response("Invalid payload", { status: 400 }); }
      if (event.event !== "charge.success" || !/^rdx-[a-f0-9-]{36}$/.test(event.data.reference)) return new Response("ok");
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: payment, error } = await supabaseAdmin.from("international_payments").select("reference,amount_minor,currency,status").eq("reference", event.data.reference).maybeSingle();
        if (error) return new Response("Payment lookup failed", { status: 500 });
        if (!payment || payment.status === "test_paid") return new Response("ok");
        if (payment.status === "paid") {
          const { notifyInternationalSale } = await import('@/lib/international-sale.server');
          await notifyInternationalSale(supabaseAdmin, payment.reference);
          const { sendPurchaseEmails } = await import('@/lib/purchase-email.server');
          await sendPurchaseEmails(supabaseAdmin, 'international', payment.reference);
          return new Response('ok');
        }
        const { paystackRequest } = await import("@/lib/paystack.server");
        const verified = await paystackRequest(`/transaction/verify/${encodeURIComponent(payment.reference)}`);
        const status = verifiedInternationalState(payment, verified);
        const { error: updateError } = await supabaseAdmin.from("international_payments").update({ status, ...(status === "paid" ? { paid_at: new Date().toISOString() } : {}) }).eq("reference", payment.reference).not("status", "in", "(paid,test_paid)");
        if (updateError) return new Response("Payment update failed", { status: 500 });
        if (status === 'paid') {
          const { notifyInternationalSale } = await import('@/lib/international-sale.server');
          await notifyInternationalSale(supabaseAdmin, payment.reference);
          const { sendPurchaseEmails } = await import('@/lib/purchase-email.server');
          await sendPurchaseEmails(supabaseAdmin, 'international', payment.reference);
        }
        return new Response("ok");
      } catch { return new Response("Payment verification failed", { status: 502 }); }
    },
  } },
});