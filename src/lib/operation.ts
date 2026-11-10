import { z } from "zod";

export const operationEventSchema = z.object({
  kind: z.enum(["product", "link"]),
  slug: z.string().min(1).max(80).regex(/^[a-zA-Z0-9-]+$/),
  session_id: z.string().uuid().optional(),
  token: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  event: z.enum(["visited", "started", "completed", "attempted", "error", "heartbeat"]),
  source: z.string().max(100).regex(/^[\p{L}\p{N} ._\/-]*$/u).default("Direto"),
  campaign: z.string().max(100).regex(/^[\p{L}\p{N} ._\/-]*$/u).default(""),
  device: z.enum(["mobile", "desktop", "tablet"]).default("desktop"),
});

export function formMilestone(name: string, phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^258/, "");
  if (name.trim().length >= 2 && /^8[4567]\d{7}$/.test(digits)) return "completed";
  if (name.trim() || digits) return "started";
  return null;
}

export function canReadOperation(ownerId: string, userId: string) {
  return ownerId === userId;
}

export type OperationData = {
  totals: Record<"visits" | "started" | "completed" | "attempted" | "paid" | "failed" | "pending" | "errors" | "abandoned" | "active", number>;
  hourly: { ts: string; leads: number; completed: number; paid: number }[];
  sources: { source: string; leads: number; paid: number }[];
  resources: { resource_id: string; resource_name: string; leads: number; paid: number }[];
  recent: { id: string; resource_name: string; source: string; campaign: string; device: string; created_at: string; last_seen_at: string; stage: string }[];
  updated_at: string;
};