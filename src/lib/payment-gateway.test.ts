import { describe, it, expect, vi, afterEach } from "vitest";
import { netshopCharge, netshopCheck } from "./netshop.server";
import { orderMatches } from "./paynow.server";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function credentials() { vi.stubEnv("LOVABLE_API_KEY", "fixture"); vi.stubEnv("UDC_PAYNOW_PAGAJA_API_KEY", "fixture"); }
describe("national PayNow migration", () => {
  it.each(["mpesa", "emola"] as const)("routes new %s charges to PayNow", async method => {
    credentials();
    const mock = vi.fn(async (url, init) => {
      expect(String(url)).toBe("https://connector-gateway.lovable.dev/udc_paynow_pagaja/api/v1/charges");
      expect(init.method).toBe("POST");
      const body = JSON.parse(init.body);
      expect(body.amount).toBe(300); expect(body.currency).toBe("MZN"); expect(body.payment_method).toBe(method);
      expect(body.customer_email).toBe("buyer@example.test");
      return Response.json({ success: true, data: { reference: "order-1", status: "pending", checkout_url: null } });
    });
    vi.stubGlobal("fetch", mock);
    const result = await netshopCharge({ amount: 300, customer_name: "Buyer", customer_email: "buyer@example.test", customer_phone: method === "mpesa" ? "841234567" : "861234567", method });
    expect(result.gateway).toBe("paynow"); expect(result.paid).toBe(false); expect(result.test_mode).toBe(false);
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it("never treats TEST success as real payment", async () => {
    credentials(); vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true, data: { reference: "test_1", status: "success", test_mode: true } })));
    const result = await netshopCharge({ amount: 50, customer_name: "Buyer", customer_email: "buyer@example.test", customer_phone: "841234567" });
    expect(result.test_mode).toBe(true); expect(result.paid).toBe(false);
  });
  it("does not retry charges after ambiguous network failure", async () => {
    credentials(); const mock = vi.fn(async () => { throw new Error("timeout"); }); vi.stubGlobal("fetch", mock);
    await expect(netshopCharge({ amount: 50, customer_name: "Buyer", customer_email: "buyer@example.test", customer_phone: "841234567" })).rejects.toThrow("timeout");
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it("requires the documented 50 MT minimum and derives a placeholder email when the buyer omits it", async () => {
    const mock = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      expect(body.customer_email).toBe("cliente-841234567@redoxpay.site");
      return Response.json({ success: true, data: { reference: "order-2", status: "pending", checkout_url: null } });
    });
    vi.stubGlobal("fetch", mock);
    await expect(netshopCharge({ amount: 49, customer_name: "Buyer", customer_email: "buyer@example.test", customer_phone: "841234567" })).rejects.toThrow();
    expect(mock).not.toHaveBeenCalled();
    credentials();
    const result = await netshopCharge({ amount: 300, customer_name: "Buyer", customer_phone: "841234567" });
    expect(result.gateway).toBe("paynow");
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it("only accepts matching MZN reference and amount, never test orders", () => {
    const tx = { external_ref: "order-1", amount_mzn: 300 };
    const order = { id: "order-1", amount: 300, currency: "MZN", status: "paid" as const };
    expect(orderMatches(order, tx)).toBe(true);
    expect(orderMatches({ ...order, currency: "ZAR" }, tx)).toBe(false);
    expect(orderMatches({ ...order, amount: 301 }, tx)).toBe(false);
    expect(orderMatches({ ...order, id: "other" }, tx)).toBe(false);
    expect(orderMatches({ ...order, id: "test_1" }, { ...tx, external_ref: "test_1" })).toBe(false);
  });
  it("keeps old Pagar references queryable", async () => {
    vi.stubEnv("PAGAR_API_KEY", "fixture"); vi.stubGlobal("fetch", vi.fn(async url => {
      expect(String(url)).toBe("https://api.pagar.co.mz/api/v1/payments/pay_old");
      return Response.json({ payment: { id: "pay_old", status: "PAID", environment: "LIVE", amountMzn: 300 } });
    }));
    expect(await netshopCheck("pay_old")).toBe("paid");
  });
});