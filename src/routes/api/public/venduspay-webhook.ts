import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/venduspay-webhook")({
  server: { handlers: { POST: async ({ request }) => {
    const raw = await request.text();
    const secret = process.env["VENDUSPAY_WEBHOOK_SECRET"];
    const { validVendusWebhook, vendusStatus } = await import("@/lib/venduspay.server");
    if (!secret) return new Response("not configured", { status: 500 });
    if (!validVendusWebhook(raw, request.headers.get("X-Webhook-Timestamp") || "", request.headers.get("X-Webhook-Signature") || "", secret)) {
      return new Response("unauthorized", { status: 401 });
    }
    try {
      const event = JSON.parse(raw);
      const ref = String(event?.data?.partner_transaction_id || "");
      if (!/^[A-Za-z0-9_-]{4,64}$/.test(ref)) return Response.json({ ok: true, ignored: true });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: tx, error } = await supabaseAdmin.from("transactions").select("id,status,metadata,amount_mzn")
        .eq("external_ref", ref).maybeSingle();
      if (error) throw error;
      if (!tx || tx.status !== "pending" || (tx.metadata as any)?.gateway !== "venduspay") return Response.json({ ok: true });
      if (event?.data?.amount != null && Number(event.data.amount) !== Number(tx.amount_mzn)) return new Response("amount mismatch", { status: 409 });
      // The authenticated status query is the source of truth.
      const st = await vendusStatus(ref);
      if (st === "failed") await supabaseAdmin.from("transactions").update({ status: "failed" }).eq("id", tx.id).eq("status", "pending");
      if (st === "paid") {
        const { data: changed, error: e2 } = await supabaseAdmin.rpc("settle_pagar_payment", { p_transaction_id: tx.id, p_event_id: String(event.id || `vendus:${ref}`) });
        if (e2) throw e2;
        if (changed) {
          const { notifyNewSale } = await import("@/lib/sale-notify.server");
          await notifyNewSale(supabaseAdmin, tx.id);
        }
      }
      return Response.json({ ok: true });
    } catch { return Response.json({ ok: false }, { status: 503 }); }
  } } },
});
