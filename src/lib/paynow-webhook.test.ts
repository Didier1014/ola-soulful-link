import { describe, expect, it } from "vitest";
import { handlePaynowWebhook, verifyPaynowSignature } from "./paynow-webhook";

const secret = "unit-test-only-webhook-secret";
const raw = JSON.stringify({ event: "payment.completed", data: { id: "order-1", amount: 500, currency: "MZN", status: "paid", created_at: "2026-11-17T03:26:00Z" } });
async function sign(body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`1794885960.${body}`));
  return `t=1794885960,v1=${Array.from(new Uint8Array(signed), b => b.toString(16).padStart(2, "0")).join("")}`;
}
describe("PayNow webhook", () => {
  it("validates timestamp plus the exact raw body per provider documentation", async () => {
    const header = await sign(raw);
    expect(await verifyPaynowSignature(raw, header, secret)).toBe(true);
    expect(await verifyPaynowSignature(`${raw} `, header, secret)).toBe(false);
    expect(await verifyPaynowSignature(raw, header, "wrong")).toBe(false);
  });
  it("rejects unsigned payment claims", async () => {
    expect((await handlePaynowWebhook(new Request("https://example.test", { method: "POST", body: raw }), secret)).status).toBe(401);
  });
  it("does not acknowledge or settle payments before provider activation", async () => {
    const request = new Request("https://example.test", { method: "POST", body: raw, headers: { "x-pagaja-signature": await sign(raw) } });
    expect((await handlePaynowWebhook(request, secret)).status).toBe(503);
  });
});