import { describe, expect, it } from "vitest";
import { resolveCheckoutStyle } from "./checkout-style";
describe("product checkout style", () => {
  it("keeps existing products on the normal checkout", () => {
    expect(resolveCheckoutStyle(undefined)).toBe("normal");
    expect(resolveCheckoutStyle({ language: "en" })).toBe("normal");
  });
  it("honors the selected offer style independently of language and currency", () => {
    expect(resolveCheckoutStyle({ style: "offer", language: "en", currency: "ZAR" })).toBe("offer");
    expect(resolveCheckoutStyle({ style: "offer", language: "pt", currency: "MZN" })).toBe("offer");
  });
  it("allows switching back to normal", () => {
    expect(resolveCheckoutStyle({ style: "normal" })).toBe("normal");
    expect(resolveCheckoutStyle({ style: "invalid" })).toBe("normal");
  });
});