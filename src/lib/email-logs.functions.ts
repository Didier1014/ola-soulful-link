// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase
    .rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Acesso restrito a administradores");
}

export const getEmailLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { rangeDays?: number; template?: string | null; status?: string | null; search?: string | null; limit?: number }) => d)
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const days = data.rangeDays ?? 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let q = supabaseAdmin
      .from("email_send_log")
      .select("id, message_id, template_name, recipient_email, status, error_message, metadata, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (data.template) q = q.eq("template_name", data.template);
    if (data.search) q = q.ilike("recipient_email", `%${data.search}%`);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Dedupe by message_id keeping latest (first since sorted desc)
    const seen = new Set<string>();
    const latest: any[] = [];
    for (const r of rows ?? []) {
      const key = r.message_id ?? r.id;
      if (seen.has(key)) continue;
      seen.add(key);
      latest.push(r);
    }

    const filtered = data.status ? latest.filter((r) => r.status === data.status) : latest;

    const stats = { total: latest.length, sent: 0, pending: 0, dlq: 0, failed: 0, suppressed: 0, bounced: 0, complained: 0 };
    for (const r of latest) {
      if (r.status in stats) (stats as any)[r.status] += 1;
    }

    // Distinct templates (from full window, ignoring template filter)
    const { data: tplRows } = await supabaseAdmin
      .from("email_send_log")
      .select("template_name")
      .gte("created_at", since);
    const templates = Array.from(new Set((tplRows ?? []).map((r: any) => r.template_name).filter(Boolean))).sort();

    return {
      rows: filtered.slice(0, data.limit ?? 200),
      stats,
      templates,
      total_after_filter: filtered.length,
    };
  });
