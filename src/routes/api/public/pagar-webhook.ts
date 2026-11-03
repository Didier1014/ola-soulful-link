import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/pagar-webhook")({
  server: { handlers: { POST: async ({ request }) => {
    const raw = await request.text();
    const secret = process.env.PAGAR_WEBHOOK_SECRET;
    const eventId = request.headers.get("Pagar-Event-Id");
    const { validWebhook, pagarPayment, paymentState } = await import("@/lib/pagar.server");
    if (!secret || !eventId || !validWebhook(raw, request.headers.get("Pagar-Signature") || "", secret)) return new Response("unauthorized", { status: 401 });
    try {
      const event = JSON.parse(raw);
      if (event.type === "webhook.test" || event.event === "webhook.test") return Response.json({ ok: true });
      const candidate = event.data?.payment ?? event.data ?? event.payment;
      if (!candidate?.id || !String(candidate.id).startsWith("pay_")) return Response.json({ ok: true, ignored: true });
      // The authenticated query is the source of truth, including environment and amount.
      const payment = await pagarPayment(candidate.id);
      const state = paymentState(payment);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: tx, error } = await supabaseAdmin.from("transactions").select("id,status,metadata,amount_mzn")
        .eq("external_ref", payment.id).maybeSingle();
      if (error) throw error;
      if (!tx || tx.status !== "pending" || (tx.metadata as any)?.gateway !== "pagar") return Response.json({ ok: true });
      if (Number(tx.amount_mzn) !== payment.amountMzn) return new Response("amount mismatch", { status: 409 });
      if (state.test_mode || (tx.metadata as any)?.test_mode) {
        await supabaseAdmin.from("transactions").update({ status: state.status === "pending" ? "pending" : "failed",
          metadata: { ...(tx.metadata as any), test_mode: true, gateway_status: state.status, pagar_event_id: eventId },
        }).eq("id", tx.id).eq("status", "pending");
        return Response.json({ ok: true, test_mode: true });
      }
      if (state.status === "failed") await supabaseAdmin.from("transactions").update({ status: "failed" }).eq("id", tx.id).eq("status", "pending");
      if (state.canCredit) {
        // Existing atomic settlement function guards duplicate credit and notification.
        const { error: settleError } = await supabaseAdmin.rpc("settle_pagar_payment", { p_transaction_id: tx.id, p_event_id: eventId });
        if (settleError) throw settleError;
        const { notifyNewSale } = await import("@/lib/sale-notify.server");
        await notifyNewSale(supabaseAdmin, tx.id);
      }
      return Response.json({ ok: true });
    } catch { return Response.json({ ok: false }, { status: 503 }); }
  } } },
});