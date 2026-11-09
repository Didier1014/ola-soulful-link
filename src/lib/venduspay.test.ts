import { describe, expect, it } from "vitest";
import { classifyVendusStatus } from "./venduspay.server";

describe("VendusPay credential validation", () => {
  it("treats 401 as invalid and keeps the API message", () => {
    expect(classifyVendusStatus(401, "Unauthorized")).toEqual({ connected: false, status: 401, message: "Unauthorized" });
  });
  it("treats 403 as invalid", () => {
    expect(classifyVendusStatus(403, "Forbidden").connected).toBe(false);
  });
  it.each([200, 400, 404, 422])("treats %i as valid", (s) => {
    expect(classifyVendusStatus(s, "x").connected).toBe(true);
  });
});
