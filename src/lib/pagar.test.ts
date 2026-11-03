import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { paymentState, validWebhook } from "./pagar.server";

test("simulated PAID never credits real seller balance", () => {
  assert.equal(paymentState({ status: "PAID", environment: "TEST" }).canCredit, false);
});
test("confirmed LIVE payment can credit", () => {
  assert.equal(paymentState({ status: "PAID", environment: "LIVE" }).canCredit, true);
});
test("processing and reconciliation never credit", () => {
  for (const status of ["PROCESSING", "RECONCILIATION_REQUIRED", "PENDING"]) {
    assert.equal(paymentState({ status, environment: "LIVE" }).canCredit, false);
  }
});
test("webhook rejects changed body and timestamps beyond five minutes", () => {
  const raw = '{"type":"webhook.test"}';
  const now = 1800000000000;
  const timestamp = String(now / 1000);
  const signature = createHmac("sha256", "unit-test-fixture").update(`${timestamp}.${raw}`).digest("hex");
  assert.equal(validWebhook(raw, `t=${timestamp},v1=${signature}`, "unit-test-fixture", now), true);
  assert.equal(validWebhook(raw + " ", `t=${timestamp},v1=${signature}`, "unit-test-fixture", now), false);
  assert.equal(validWebhook(raw, `t=${timestamp},v1=${signature}`, "unit-test-fixture", now + 301000), false);
});