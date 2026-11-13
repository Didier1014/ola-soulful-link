import { useEffect, useRef, useCallback } from "react";
import { formMilestone } from "@/lib/operation";

type Session = { session_id: string; token: string; expires: number };
type Event = "visited" | "started" | "completed" | "attempted" | "error" | "heartbeat";

export function useCheckoutOperation(kind: "product" | "link", slug: string, enabled: boolean, name: string, phone: string, international = false) {
  const session = useRef<Session | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const sent = useRef(new Set<string>());
  const attribution = useRef<{ funnel_session_id?: string; funnel_token?: string }>({});
  const send = useCallback((event: Event) => {
    queue.current = queue.current.catch(() => {}).then(async () => {
      if (!session.current) return;
      const response = await fetch("/api/public/checkout-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, slug, event, session_id: session.current.session_id, token: session.current.token, ...attribution.current }), keepalive: true });
      if (!response.ok) sent.current.delete(event);
    }).catch(() => { sent.current.delete(event); });
  }, [kind, slug]);
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const incoming = new URLSearchParams(window.location.search);
    const funnelId = incoming.get("rxf_session"), funnelToken = incoming.get("rxf_token");
    if (funnelId && funnelToken) attribution.current = { funnel_session_id: funnelId, funnel_token: funnelToken };
    const key = `redox-operation:${kind}:${slug}`;
    const clean = (value: string) => value.replace(/[^\p{L}\p{N} ._\/-]/gu, "").slice(0, 100);
    queue.current = (async () => {
      try {
        const saved = sessionStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved) as Session;
          if (parsed.expires > Date.now()) session.current = parsed;
        }
      } catch { /* Storage is optional. */ }
      if (!session.current) {
        const params = new URLSearchParams(window.location.search);
        let referrer = "";
        try { referrer = document.referrer ? new URL(document.referrer).hostname : ""; } catch {}
        const response = await fetch("/api/public/checkout-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, slug, event: "visited", source: clean(params.get("utm_source") || params.get("src") || referrer || "Direto"), campaign: clean(params.get("utm_campaign") || ""), device: /iPad|Tablet/i.test(navigator.userAgent) ? "tablet" : /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop", ...attribution.current }) });
        if (!response.ok) return;
        const result = await response.json();
        if (stopped) return;
        session.current = { ...result, expires: Date.now() + 30 * 60 * 1000 };
        try { sessionStorage.setItem(key, JSON.stringify(session.current)); } catch {}
      } else if (attribution.current.funnel_session_id) send("heartbeat");
    })().catch(() => {});
    const timer = setInterval(() => { if (document.visibilityState === "visible") send("heartbeat"); }, 60000);
    return () => { stopped = true; clearInterval(timer); };
  }, [enabled, kind, slug, send]);

  useEffect(() => {
    if (!enabled) return;
    const milestone = international ? (name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(phone) ? "completed" : name.trim() || phone.trim() ? "started" : null) : formMilestone(name, phone);
    if (!milestone || sent.current.has(milestone)) return;
    sent.current.add(milestone);
    send(milestone);
  }, [enabled, name, phone, send, international]);

  return {
    attempt: async () => { send("attempted"); return session.current ? { operation_session_id: session.current.session_id } : {}; },
    error: () => send("error"),
    internationalAttempt: async () => { await queue.current.catch(() => {}); send("attempted"); return session.current ? { operation_session_id: session.current.session_id, operation_token: session.current.token } : {}; },
  };
}