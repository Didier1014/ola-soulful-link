import { describe, it, expect } from "vitest";
import { formMilestone, operationEventSchema, canReadOperation } from "./operation";

describe("checkout operation rules", () => {
  it("counts initial filling separately from completed payer details", () => {
    expect(formMilestone("", "")).toBeNull();
    expect(formMilestone("Maria", "")).toBe("started");
    expect(formMilestone("Maria", "841234567")).toBe("completed");
    expect(formMilestone("Maria", "+258 86 123 4567")).toBe("completed");
    expect(formMilestone("Maria", "84123")).toBe("started");
  });
  it("never accepts browser claims of successful or failed payments", () => {
    expect(operationEventSchema.safeParse({ kind: "product", slug: "txuna-mpesa", event: "paid" }).success).toBe(false);
    expect(operationEventSchema.safeParse({ kind: "product", slug: "txuna-mpesa", event: "failed" }).success).toBe(false);
  });
  it("strips personal data and seller identity from analytics events", () => {
    const event = operationEventSchema.parse({ kind: "product", slug: "txuna-mpesa", event: "visited", customer_phone: "841234567", customer_name: "Maria", user_id: "someone-else" });
    expect(event).not.toHaveProperty("customer_phone");
    expect(event).not.toHaveProperty("customer_name");
    expect(event).not.toHaveProperty("user_id");
  });
  it("restricts operations to the seller's own sessions", () => {
    expect(canReadOperation("seller-a", "seller-a")).toBe(true);
    expect(canReadOperation("seller-a", "seller-b")).toBe(false);
  });
});