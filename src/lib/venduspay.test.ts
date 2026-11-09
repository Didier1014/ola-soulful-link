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
