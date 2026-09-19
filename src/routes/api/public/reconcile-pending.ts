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

    for (const tx of pend ?? []) {
      const st = await netshopCheck(String(tx.external_ref));
      if (st === "paid") {
        const { data: changed } = await supabaseAdmin
          .from("transactions")
          .update({ status: "paid" })
          .eq("id", tx.id)
          .eq("status", "pending")
          .select("id")
          .maybeSingle();
        if (changed) {
          const { data: prof } = await supabaseAdmin
            .from("profiles").select("balance_mzn").eq("id", tx.user_id).maybeSingle();
          await supabaseAdmin.from("profiles")
            .update({ balance_mzn: Number(prof?.balance_mzn ?? 0) + Number(tx.net_mzn) })
            .eq("id", tx.user_id);
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
