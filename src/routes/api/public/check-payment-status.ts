import { createFileRoute } from "@tanstack/react-router";

// GET /api/public/check-payment-status?txid=...
// Headers: x-merchant-api-key
export const Route = createFileRoute("/api/public/check-payment-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const apiKey = request.headers.get("x-merchant-api-key")?.trim();
          if (!apiKey || !apiKey.startsWith("rdx_")) {
            return Response.json({ error: "unauthorized" }, { status: 401 });
          }
          const url = new URL(request.url);
          const txid = url.searchParams.get("txid")?.trim();
          if (!txid) return Response.json({ error: "txid obrigatório" }, { status: 400 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: merchant } = await supabaseAdmin
            .from("profiles").select("id").eq("api_key", apiKey).maybeSingle();
          if (!merchant) return Response.json({ error: "unauthorized" }, { status: 401 });

          const { data: tx } = await supabaseAdmin
            .from("transactions")
            .select("status,external_ref,user_id")
            .eq("external_ref", txid)
            .eq("user_id", merchant.id)
            .maybeSingle();
          if (!tx) return Response.json({ error: "not_found" }, { status: 404 });

          return Response.json({
            status: tx.status,
            partner_transaction_id: tx.external_ref,
          });
        } catch (e) {
          console.log("[check-payment-status] error", e);
          return Response.json({ error: "internal" }, { status: 500 });
        }
      },
    },
  },
});
