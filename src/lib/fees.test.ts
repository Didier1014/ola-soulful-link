import { test } from "node:test";
import { strict as assert } from "node:assert";
import { calcFee } from "./fees";

test("seller fee is 8% with no fixed amount", () => {
  assert.deepEqual(calcFee(300), { seller_fee: 24, seller_net: 276 });
});
