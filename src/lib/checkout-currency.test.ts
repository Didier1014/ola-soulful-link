import { describe, it, expect } from "vitest";
import { productPricing, requireNationalProduct, internationalAmounts, verifiedInternationalState } from "./checkout-currency";

describe("product checkout currencies", () => {
  it("keeps MT national", () => expect(productPricing({ price_mzn: 300 })).toEqual({ checkout_provider: "national", currency: "MZN", price_amount: 300, price_mzn: 300 }));
  it("stores Paystack ZAR without creditable MT", () => expect(productPricing({ checkout_provider: "paystack", currency: "ZAR", price_amount: 300, price_mzn: 0 })).toEqual({ checkout_provider: "paystack", currency: "ZAR", price_amount: 300, price_mzn: 0 }));
  it("reserves Stripe EUR and USD", () => {
    for (const currency of ["EUR", "USD"]) expect(productPricing({ checkout_provider: "stripe", currency, price_amount: 10, price_mzn: 0 }).currency).toBe(currency);
    expect(() => productPricing({ checkout_provider: "stripe", currency: "ZAR", price_mzn: 10 })).toThrow();
  });
  it("rejects Paystack non-ZAR", () => expect(() => productPricing({ checkout_provider: "paystack", currency: "MZN", price_mzn: 300 })).toThrow());
  it("rejects international products in national payment callers", () => expect(() => requireNationalProduct({ checkout_provider: "paystack" })).toThrow());
  it("calculates the standing 8% fee in ZAR cents", () => expect(internationalAmounts(300)).toEqual({ amount_minor: 30000, fee_minor: 2400, net_minor: 27600 }));
  it("never treats a test success as a real sale", () => expect(verifiedInternationalState({ reference: "ref", amount_minor: 30000, currency: "ZAR" }, { reference: "ref", amount: 30000, currency: "ZAR", status: "success", domain: "test" })).toBe("test_paid"));
  it("rejects mismatched confirmed amount/currency/reference", () => {
    for (const invalid of [{ amount: 1 }, { currency: "USD" }, { reference: "other" }]) expect(() => verifiedInternationalState({ reference: "ref", amount_minor: 30000, currency: "ZAR" }, { reference: "ref", amount: 30000, currency: "ZAR", status: "success", domain: "live", ...invalid })).toThrow();
  });
});