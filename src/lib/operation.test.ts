import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formMilestone, operationEventSchema, canReadOperation } from "./operation";

describe("checkout operation rules", () => {
  it("counts initial filling separately from completed payer details", () => {
    assert.equal(formMilestone("", ""), null);
    assert.equal(formMilestone("Maria", ""), "started");
    assert.equal(formMilestone("Maria", "841234567"), "completed");
    assert.equal(formMilestone("Maria", "+258 86 123 4567"), "completed");
    assert.equal(formMilestone("Maria", "84123"), "started");
  });
  it("never accepts browser claims of successful or failed payments", () => {
    assert.equal(operationEventSchema.safeParse({ kind: "product", slug: "txuna-mpesa", event: "paid" }).success, false);
    assert.equal(operationEventSchema.safeParse({ kind: "product", slug: "txuna-mpesa", event: "failed" }).success, false);
  });
  it("strips personal data and seller identity from analytics events", () => {
    const event = operationEventSchema.parse({ kind: "product", slug: "txuna-mpesa", event: "visited", customer_phone: "841234567", customer_name: "Maria", user_id: "someone-else" });
    assert.equal("customer_phone" in event, false);
    assert.equal("customer_name" in event, false);
    assert.equal("user_id" in event, false);
  });
  it("restricts operations to the seller's own sessions", () => {
    assert.equal(canReadOperation("seller-a", "seller-a"), true);
    assert.equal(canReadOperation("seller-a", "seller-b"), false);
  });
});