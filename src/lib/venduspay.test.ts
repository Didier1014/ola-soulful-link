import { test } from "node:test";
import { strict as assert } from "node:assert";
import { classifyVendusStatus } from "./venduspay.server";

test("VendusPay 401 is invalid and keeps the API message", () => {
  assert.deepEqual(classifyVendusStatus(401, "Unauthorized"), { connected: false, status: 401, message: "Unauthorized" });
});

test("VendusPay 403 is invalid", () => {
  assert.equal(classifyVendusStatus(403, "Forbidden").connected, false);
});

for (const s of [200, 400, 404, 422]) {
  test(`VendusPay ${s} is valid`, () => {
    assert.equal(classifyVendusStatus(s, "x").connected, true);
  });
}

import { createHmac } from "node:crypto";
import { vendusState, validVendusWebhook } from "./venduspay.server";

test("only SUCCESS counts as paid", () => {
  assert.equal(vendusState("SUCCESS"), "paid");
  assert.equal(vendusState("PENDING"), "pending");
  assert.equal(vendusState("FAILED"), "failed");
  assert.equal(vendusState("EXPIRED"), "failed");
});

test("webhook signature over timestamp.raw is accepted; tampered or stale rejected", () => {
  const raw = '{"type":"PAYMENT.SUCCESS"}';
  const ts = "1791418083";
  const sig = "sha256=" + createHmac("sha256", "whsec_x").update(`${ts}.${raw}`).digest("hex");
  const now = 1791418083 * 1000;
  assert.equal(validVendusWebhook(raw, ts, sig, "whsec_x", now), true);
  assert.equal(validVendusWebhook(raw + " ", ts, sig, "whsec_x", now), false);
  assert.equal(validVendusWebhook(raw, ts, sig, "whsec_x", now + 301_000), false);
});
