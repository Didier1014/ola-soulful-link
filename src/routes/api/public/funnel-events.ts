import { createFileRoute } from "@tanstack/react-router";
import { funnelInputSchema, allowedOrigin } from "@/lib/funnel";

async function hash(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), b => b.toString(16).padStart(2, "0")).join(""); }
const cors = (origin: string | null) => ({ "Access-Control-Allow-Origin": origin || "null", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "no-store", Vary: "Origin" });
export const Route = createFileRoute("/api/public/funnel-events")({ server: { handlers: {
  OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: cors(request.headers.get("origin")) }),
  POST: async ({ request }) => {
    const origin = request.headers.get("origin"), headers = cors(origin);
    const fail = (status: number) => new Response(null, { status, headers });
    if (!origin || origin === "null") return fail(403);
    if (Number(request.headers.get("content-length") || 0) > 16000) return fail(413);
    const raw = await request.text(); if (raw.length > 16000) return fail(413);
    let input; try { input = funnelInputSchema.parse(JSON.parse(raw)); } catch { return fail(400); }
    // The identifier is public, not a secret. Domain scope and session capability restrict ingestion; analytics are not payment truth.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: funnel, error: lookupError } = await supabaseAdmin.from("operation_funnels").select("id,origin,active").eq("id", input.funnel_id).maybeSingle();
    if (lookupError) return fail(503);
    if (!funnel?.active || !allowedOrigin(origin, funnel.origin)) return fail(403);
    let sessionId = input.session_id, token = input.token;
    if (sessionId || token) {
      if (!sessionId || !token) return fail(403);
      const { data: session } = await supabaseAdmin.from("funnel_sessions").select("id,created_at").eq("id", sessionId).eq("funnel_id", funnel.id).eq("token_hash", await hash(token)).maybeSingle();
      if (!session || Date.now() - new Date(session.created_at).getTime() > 86400000) return fail(403);
    } else {
      if (!input.visitor_id || input.events[0].event !== "page_view") return fail(400);
      token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
      const { data: session, error } = await supabaseAdmin.from("funnel_sessions").insert({ funnel_id: funnel.id, token_hash: await hash(token), visitor_id: input.visitor_id, source: input.source.replace(/[^\p{L}\p{N} ._/-]/gu,""), campaign: input.campaign.replace(/[^\p{L}\p{N} ._/-]/gu,""), medium: input.medium.replace(/[^\p{L}\p{N} ._/-]/gu,""), device: input.device }).select("id").single();
      if (error || !session) return fail(503); sessionId = session.id;
    }
    const { error } = await supabaseAdmin.from("funnel_events").upsert(input.events.map(e => ({ ...e, session_id: sessionId })), { onConflict: "event_id", ignoreDuplicates: true });
    if (error) return fail(503);
    await supabaseAdmin.from("funnel_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", sessionId);
    return Response.json({ session_id: sessionId, token }, { headers });
  },
} } });