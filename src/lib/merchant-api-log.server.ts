// Log de chamadas à Merchant API — usado no painel admin (aba Merchants)
// para saber que sites/domínios estão a comunicar com a nossa API.
export async function logMerchantApiCall(params: {
  request: Request;
  endpoint: string;
  userId: string | null;
  apiKey: string | null;
  statusCode: number;
  startedAt: number;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const h = params.request.headers;
    const origin = h.get("origin") || null;
    const referer = h.get("referer") || null;
    let originHost: string | null = null;
    try { if (origin) originHost = new URL(origin).hostname; } catch {}
    if (!originHost && referer) { try { originHost = new URL(referer).hostname; } catch {} }
    const ip = h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = h.get("user-agent") || null;
    await supabaseAdmin.from("merchant_api_calls").insert({
      user_id: params.userId,
      api_key_prefix: params.apiKey ? params.apiKey.slice(0, 16) : null,
      endpoint: params.endpoint,
      method: params.request.method,
      origin,
      referer,
      origin_host: originHost,
      user_agent: ua,
      ip,
      status_code: params.statusCode,
      duration_ms: Math.max(0, Date.now() - params.startedAt),
    });
  } catch (e) {
    console.log("[logMerchantApiCall] failed", e);
  }
}
