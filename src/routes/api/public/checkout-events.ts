import { createFileRoute } from "@tanstack/react-router";
import { operationEventSchema } from "@/lib/operation";

async function hash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/checkout-events")({
  server: { handlers: { POST: async ({ request }) => {
    const origin = request.headers.get("origin");
    if (origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 403 });
    if (Number(request.headers.get("content-length") || 0) > 2048) return new Response(null, { status: 413 });
    const raw = await request.text();
    if (raw.length > 2048) return new Response(null, { status: 413 });
    let input;
    try { input = operationEventSchema.parse(JSON.parse(raw)); } catch { return new Response(null, { status: 400 }); }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = input.kind === "product" ? "products" : "payment_links";
    const { data: resource } = await supabaseAdmin.from(table).select("id,user_id,active").eq("slug", input.slug).maybeSingle();
    if (!resource?.active) return new Response(null, { status: 404 });
    const headers = { "Cache-Control": "no-store" };
    if (!input.session_id || !input.token) {
      if (input.event !== "visited") return new Response(null, { status: 400 });
      // Hash network identity with a daily server-side salt; never store raw IPs or user agents.
      const salt = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";
      const requestHash = await hash(`${salt}:${new Date().toISOString().slice(0, 10)}:${request.headers.get("cf-connecting-ip") || "local"}:${request.headers.get("user-agent") || ""}`);
      const { count, error: countError } = await supabaseAdmin.from("checkout_sessions").select("id", { count: "exact", head: true }).eq("request_hash", requestHash).gte("created_at", new Date(Date.now() - 3600000).toISOString());
      if (countError) return new Response(null, { status: 503 });
      if ((count ?? 0) >= 120) return new Response(null, { status: 429 });
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
      const { data: session, error } = await supabaseAdmin.from("checkout_sessions").insert({
        user_id: resource.user_id, product_id: input.kind === "product" ? resource.id : null,
        payment_link_id: input.kind === "link" ? resource.id : null, token_hash: await hash(token), request_hash: requestHash,
        source: input.source || "Direto", campaign: input.campaign, device: input.device,
      }).select("id").single();
      if (error || !session) return new Response(null, { status: 503 });
      return Response.json({ session_id: session.id, token }, { headers });
    }
    // Updates require a random capability issued for this exact checkout; callers never choose a seller.
    const { data: session } = await supabaseAdmin.from("checkout_sessions").select("id,created_at,started_at,completed_at,attempted_at,error_at").eq("id", input.session_id).eq("token_hash", await hash(input.token)).eq(input.kind === "product" ? "product_id" : "payment_link_id", resource.id).maybeSingle();
    if (!session || Date.now() - new Date(session.created_at).getTime() > 86400000) return new Response(null, { status: 403 });
    const now = new Date().toISOString();
    const patch: { last_seen_at: string; started_at?: string; completed_at?: string; attempted_at?: string; error_at?: string } = { last_seen_at: now };
    if (["started", "completed", "attempted"].includes(input.event) && !session.started_at) patch.started_at = now;
    if (["completed", "attempted"].includes(input.event) && !session.completed_at) patch.completed_at = now;
    if (input.event === "attempted" && !session.attempted_at) patch.attempted_at = now;
    if (input.event === "error" && !session.error_at) patch.error_at = now;
    const { error } = await supabaseAdmin.from("checkout_sessions").update(patch).eq("id", session.id);
    return new Response(null, { status: error ? 503 : 204, headers });
  } } },
});