import { createFileRoute } from "@tanstack/react-router";

// GET /api/public/check-payment-status?txid=...
// Headers: x-merchant-api-key
export const Route = createFileRoute("/api/public/check-payment-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const startedAt = Date.now();
        const { logMerchantApiCall } = await import("@/lib/merchant-api-log.server");
        const apiKey = request.headers.get("x-merchant-api-key")?.trim() || null;
        let merchantId: string | null = null;
        const log = (statusCode: number) =>
          logMerchantApiCall({ request, endpoint: "check-payment-status", userId: merchantId, apiKey, statusCode, startedAt });
        try {
          if (!apiKey || !apiKey.startsWith("rdx_")) {
            await log(401);
            return Response.json({ error: "unauthorized" }, { status: 401 });
          }
          const url = new URL(request.url);
          const txid = url.searchParams.get("txid")?.trim();
          if (!txid) { await log(400); return Response.json({ error: "txid obrigatório" }, { status: 400 }); }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: merchant } = await supabaseAdmin
            .from("profiles").select("id,api_key_active")
            .eq("api_key", apiKey).eq("api_key_active", true).maybeSingle();
          if (!merchant) { await log(401); return Response.json({ error: "unauthorized" }, { status: 401 }); }
          merchantId = merchant.id;

          const { data: tx } = await supabaseAdmin
            .from("transactions")
            .select("status,external_ref,user_id")
            .eq("external_ref", txid)
            .eq("user_id", merchant.id)
            .maybeSingle();
          if (!tx) { await log(404); return Response.json({ error: "not_found" }, { status: 404 }); }

          await log(200);
          return Response.json({
            status: tx.status,
            partner_transaction_id: tx.external_ref,
          });
        } catch (e) {
          console.log("[check-payment-status] error", e);
          await log(500);
          return Response.json({ error: "internal" }, { status: 500 });
        }
      },
    },
  },
});
