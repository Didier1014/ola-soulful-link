import { describe, expect, it } from "vitest";
import { resolveCheckoutLanguage, checkoutLanguageConfig } from "./checkout-language";
describe("checkout language", () => {
  it("defaults ZAR buyers to English without overriding a selected product language", () => {
    expect(resolveCheckoutLanguage(checkoutLanguageConfig({ style: "offer" }, "ZAR"))).toBe("en");
    expect(resolveCheckoutLanguage(checkoutLanguageConfig({ language: "pt" }, "ZAR"))).toBe("pt");
    expect(resolveCheckoutLanguage(checkoutLanguageConfig({}, "MZN"))).toBe("pt");
  });
  it("honors the seller's chosen language regardless of visitor country", () => { expect(resolveCheckoutLanguage({ language: "en" }, "MZ", "pt-MZ")).toBe("en"); });
  it("uses country in automatic mode", () => { expect(resolveCheckoutLanguage({ language: "auto" }, "ZA", "pt")).toBe("en"); expect(resolveCheckoutLanguage({ language: "auto" }, "MZ", "en")).toBe("pt"); });
  it("falls back to browser language when country is unavailable", () => { expect(resolveCheckoutLanguage({ language: "auto" }, null, "es-MX")).toBe("es"); });
  it("keeps existing checkouts Portuguese by default", () => { expect(resolveCheckoutLanguage({}, "ZA", "en")).toBe("pt"); });
});