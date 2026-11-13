import { it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { validPaystackSignature } from "./paystack-signature.server";

it("requires a valid SHA512 signature over the untouched body", () => {
  const body = '{"event":"charge.success"}';
  const secret = "unit-test-only-not-a-credential";
  const signature = createHmac("sha512", secret).update(body).digest("hex");
  expect(validPaystackSignature(body, signature, secret)).toBe(true);
  expect(validPaystackSignature(body + " ", signature, secret)).toBe(false);
  expect(validPaystackSignature(body, null, secret)).toBe(false);
  expect(validPaystackSignature(body, "invalid", secret)).toBe(false);
});