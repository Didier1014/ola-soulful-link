import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listIntegrationLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { transactionId?: string; limit?: number }) => input ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("integration_logs")
      .select("id, transaction_id, provider, status_code, ok, request_payload, response_body, error, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(Math.min(data?.limit ?? 100, 500));
    if (data?.transactionId) q = q.eq("transaction_id", data.transactionId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });
