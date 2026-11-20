import { describe, it, expect } from "vitest";
import { nationalEmailSchema, validNationalEmail } from "./national-email";

describe("required PayNow buyer email", () => {
  it("rejects missing, blank and malformed buyer email", () => {
    for (const value of [undefined, "", "   ", "invalid"])
      expect(nationalEmailSchema.safeParse(value).success).toBe(false);
  });
  it("uses the trimmed buyer email without substitution", () => {
    expect(nationalEmailSchema.parse(" buyer@example.test ")).toBe("buyer@example.test");
    expect(validNationalEmail("buyer@example.test")).toBe(true);
  });
});