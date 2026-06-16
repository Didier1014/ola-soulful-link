import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/debug-notification")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const errors: string[] = [];

        // List ALL notifications (last 24h) with full data
        const yesterday = new Date(Date.now() - 86400000).toISOString();
        const { data: notifs, error: notErr } = await supabaseAdmin
          .from("notifications").select("id,user_id,type,title,created_at")
          .gte("created_at", yesterday).order("created_at", { ascending: false }).limit(20);
        if (notErr) errors.push(`notifications error: ${notErr.message}`);
        else errors.push(`notifications (24h): ${JSON.stringify(notifs)}`);

        // Check recent transactions with user_id
        const { data: txs, error: txErr } = await supabaseAdmin
          .from("transactions").select("id,user_id,status,amount_mzn,created_at")
          .order("created_at", { ascending: false }).limit(10);
        if (txErr) errors.push(`transactions: ${txErr.message}`);
        else errors.push(`recent transactions: ${JSON.stringify(txs)}`);

        return new Response(JSON.stringify({ ok: errors.length === 0, errors }, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
