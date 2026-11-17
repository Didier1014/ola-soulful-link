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
  it("rejects unsigned probes even before the webhook secret is configured", async () => {
    const response = await handlePaynowWebhook(new Request("https://example.test", { method: "POST", body: "{}" }), undefined);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Invalid signature" });
  });
  it("keeps signed deliveries retryable when configuration is missing", async () => {
    const response = await handlePaynowWebhook(new Request("https://example.test", { method: "POST", body: raw, headers: { "x-pagaja-signature": await sign(raw) } }), undefined);
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("3600");
  });
  it("does not acknowledge or settle payments before provider activation", async () => {
    const request = new Request("https://example.test", { method: "POST", body: raw, headers: { "x-pagaja-signature": await sign(raw) } });
    expect((await handlePaynowWebhook(request, secret)).status).toBe(503);
  });
  it("acknowledges only after successful verified settlement", async () => {
    const request = new Request("https://example.test", { method: "POST", body: raw, headers: { "x-pagaja-signature": await sign(raw) } });
    let reference = "";
    const response = await handlePaynowWebhook(request, secret, async ref => { reference = ref; return "paid"; });
    expect(reference).toBe("order-1"); expect(response.status).toBe(200);
  });
  it("retries a delivery when the authenticated order is not confirmed", async () => {
    const request = new Request("https://example.test", { method: "POST", body: raw, headers: { "x-pagaja-signature": await sign(raw) } });
    expect((await handlePaynowWebhook(request, secret, async () => "pending")).status).toBe(503);
  });
});