import { createFileRoute } from "@tanstack/react-router";

// Reconciliação automática: consulta o gateway para transacções pendentes
// que já têm referência (external_ref) e fecha-as como paid/failed.
// Chamado por cron a cada 5 minutos. Sem dados sensíveis na resposta.
export const Route = createFileRoute("/api/public/reconcile-pending")({
  server: {
    handlers: {
      POST: async () => run(),
      GET: async () => run(),
    },
  },
});

async function run() {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { netshopCheck } = await import("@/lib/netshop.server");

    const { data: pend } = await supabaseAdmin
      .from("transactions")
      .select("id,user_id,net_mzn,external_ref,created_at,metadata")
      .eq("status", "pending")
      .not("external_ref", "is", null)
      .gt("created_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: true })
      .limit(25);

    let paid = 0, failed = 0, still = 0;

    // Recuperar cobranças PayNow cuja resposta se perdeu por timeout (sem referência).
    const { data: lost } = await supabaseAdmin.from("transactions").select("id,metadata")
      .is("external_ref", null).in("status", ["pending", "failed"]).eq("is_test", false)
      .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).limit(50);
    for (const tx of lost ?? []) {
      const m = (tx.metadata ?? {}) as any;
      if (!(m.awaiting_ref || /timeout|aborted/i.test(String(m.error_message ?? "")))) continue;
      try {
        const { recoverPaynowTx } = await import("@/lib/paynow.server");
        if (await recoverPaynowTx(tx.id) === "paid") paid++;
      } catch { /* retry next run */ }
    }

    for (const tx of pend ?? []) {
      if ((tx.metadata as any)?.gateway === "paynow" && !(tx.metadata as any)?.test_mode) {
        try {
          const { settlePaynow } = await import("@/lib/paynow.server");
          const status = await settlePaynow(String(tx.external_ref), `reconcile:${tx.id}`);
          if (status === "paid") paid++; else still++;
        } catch { still++; }
        continue;
      }
      if (!["pagar", "venduspay"].includes((tx.metadata as any)?.gateway) || (tx.metadata as any)?.test_mode) { still++; continue; }
      const st = await netshopCheck(String(tx.external_ref));
      if (st === "paid") {
        const { data: changed } = await supabaseAdmin.rpc("settle_pagar_payment", { p_transaction_id: tx.id, p_event_id: `reconcile:${tx.id}` });
        if (changed) {
          try {
            const { notifyNewSale } = await import("@/lib/sale-notify.server");
            await notifyNewSale(supabaseAdmin, tx.id);
          } catch (e) { console.log("[reconcile] notifyNewSale failed", e); }
          paid++;
        }
      } else if (st === "failed") {
        await supabaseAdmin
          .from("transactions")
          .update({
            status: "failed",
            metadata: {
              ...((tx.metadata ?? {}) as any),
              failed_reason: "Confirmado como falhado pelo gateway",
              failed_at: new Date().toISOString(),
            },
          })
          .eq("id", tx.id)
          .eq("status", "pending");
        failed++;
      } else {
        still++;
      }
    }

    return Response.json({ ok: true, checked: (pend ?? []).length, paid, failed, pending: still });
  } catch (e) {
    console.log("[reconcile-pending] error", e);
    return Response.json({ ok: false }, { status: 200 });
  }
}
