import { z } from "zod";

export const paynowEventSchema = z.object({
  event: z.literal("payment.completed"),
  data: z.object({
    id: z.string().min(1).max(200),
    amount: z.number().positive().max(100000000),
    currency: z.enum(["MZN", "ZAR", "BRL"]),
    status: z.literal("paid"),
    created_at: z.string().datetime({ offset: true }),
  }),
});

export async function verifyPaynowSignature(raw: string, header: string, secret: string) {
  const match = /^t=(\d{1,12}),v1=([a-fA-F0-9]{64})$/.exec(header.trim());
  if (!match || !secret) return false;
  const [, timestamp, signature] = match;
  if (!timestamp || !signature) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
  );
  const bytes = Uint8Array.from(signature.match(/.{2}/g) ?? [], (pair) => parseInt(pair, 16));
  return crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(`${timestamp}.${raw}`));
}

export async function handlePaynowWebhook(request: Request, secret: string | undefined) {
  const header = request.headers.get("x-pagaja-signature") ?? "";
  // Reject unauthenticated probes before checking server configuration.
  if (!/^t=\d{1,12},v1=[a-fA-F0-9]{64}$/.test(header.trim())) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  if (!secret) return Response.json({ error: "Webhook secret not configured" }, { status: 503, headers: { "Retry-After": "3600" } });
  const raw = await request.text();
  if (raw.length > 65536) return new Response("Payload too large", { status: 413 });
  if (!await verifyPaynowSignature(raw, header, secret)) {
    return new Response("Invalid signature", { status: 401 });
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }
  if (!paynowEventSchema.safeParse(parsed).success) return new Response("Invalid event", { status: 400 });
  // Keep provider retries active until PayNow charges and atomic settlement are connected.
  // Never acknowledge a sale we have not durably processed or credit the legacy ledger.
  return new Response("PayNow payment integration pending", { status: 503 });
}