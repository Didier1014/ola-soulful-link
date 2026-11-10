import { z } from "zod";

export const funnelEventNames = ["page_view", "page_complete", "click", "scroll", "engagement", "form_start", "form_submit", "quiz_start", "quiz_step", "quiz_complete", "vsl_start", "vsl_progress", "vsl_complete", "checkout_click"] as const;
export function safePath(value: string) {
  try { return new URL(value, "https://redox.invalid").pathname.replace(/[^a-zA-Z0-9/_.~-]/g, "_").slice(0, 300); } catch { return "/"; }
}
export function allowedOrigin(actual: string | null, expected: string) { return actual === expected; }
export const funnelConfigSchema = z.object({
  name: z.string().trim().min(1).max(80),
  origin: z.string().url().max(250).refine(v => { const u = new URL(v); return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password; }).transform(v => new URL(v).origin),
  consent_required: z.boolean().default(true),
  steps: z.array(z.object({ name: z.string().trim().min(1).max(80), path: z.string().min(1).max(300).transform(safePath) })).max(20).default([]),
});
export const funnelInputSchema = z.object({
  funnel_id: z.string().uuid(), visitor_id: z.string().uuid().optional(), session_id: z.string().uuid().optional(), token: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  source: z.string().max(100).default("Direto"), campaign: z.string().max(100).default(""), medium: z.string().max(100).default(""), device: z.enum(["desktop", "mobile", "tablet"]).default("desktop"),
  events: z.array(z.object({ event_id: z.string().uuid(), event: z.enum(funnelEventNames), path: z.string().max(500).transform(safePath), label: z.string().max(80).regex(/^[\p{L}\p{N} ._/-]*$/u).default(""), value: z.number().int().min(0).max(86400).default(0) })).min(1).max(20),
});
export type FunnelReport = {
  totals: { sessions: number; visitors: number; active: number }; counts: { event: string; events: number; leads: number }[];
  pages: { path: string; views: number; leads: number; completed: number; seconds: number }[];
  sources: { source: string; campaign: string; medium: string; sessions: number; visitors: number }[];
  hourly: { ts: string; leads: number }[]; media: { label: string; event: string; value: number; leads: number }[];
  recent: { id: string; session_id: string; event: string; path: string; label: string; value: number; created_at: string; device: string; source: string }[];
  journeys: { id: string; source: string; device: string; pages: { path: string; at: string }[] | null }[]; checkout: number; paid: number;
};
export const funnelLabels: Record<string, string> = { page_view: "Página visitada", page_complete: "Página concluída", click: "Clique", scroll: "Deslocamento", engagement: "Tempo ativo", form_start: "Formulário iniciado", form_submit: "Formulário enviado", quiz_start: "Quiz iniciado", quiz_step: "Etapa do quiz", quiz_complete: "Quiz concluído", vsl_start: "VSL iniciada", vsl_progress: "Progresso da VSL", vsl_complete: "VSL concluída", checkout_click: "Clique para checkout" };