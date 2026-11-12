import { test } from "node:test";
import { strict as assert } from "node:assert";
import { netshopCharge } from "./netshop.server";

test("new M-Pesa and e-Mola charges use signed Pagar requests and preserve order idempotency", async () => {
  const fetchOriginal = globalThis.fetch;
  const oldKey = process.env.PAGAR_API_KEY;
  const oldSecret = process.env.PAGAR_SIGNING_SECRET;
  process.env.PAGAR_API_KEY = "test-fixture";
  process.env.PAGAR_SIGNING_SECRET = "signing-fixture";
  try {
    for (const [method, phone] of [["mpesa", "841234567"], ["emola", "861234567"]] as const) {
      globalThis.fetch = async (url, init) => {
        assert.equal(String(url), "https://api.pagar.co.mz/api/v1/payments");
        assert.equal(init?.method, "POST");
        const headers = new Headers(init?.headers);
        assert.equal(headers.get("Idempotency-Key"), "order-fixture");
        assert.match(headers.get("X-Pagar-Signature") || "", /^v1=[a-f0-9]{64}$/);
        const body = JSON.parse(String(init?.body));
        assert.equal(body.reference, "order-fixture");
        assert.equal(body.method, method.toUpperCase());
        assert.equal(body.payerPhone, phone);
        assert.equal(body.amountMzn, 300);
        return Response.json({ payment: { id: "pay_fixture", status: "PROCESSING", environment: "LIVE", amountMzn: 300 } });
      };
      const result = await netshopCharge({ amount: 300, customer_name: "Fixture", customer_phone: phone, method, idempotencyKey: "order-fixture" });
      assert.equal(result.gateway, "pagar");
      assert.equal(result.status, "pending");
      assert.equal(result.paid, false);
      globalThis.fetch = async () => Response.json({ payment: { id: "pay_fixture", status: "PAID", environment: "TEST", amountMzn: 300 } });
      const simulated = await netshopCharge({ amount: 300, customer_name: "Fixture", customer_phone: phone, method });
      assert.equal(simulated.test_mode, true);
      assert.equal(simulated.paid, false);
    }
  } finally {
    globalThis.fetch = fetchOriginal;
    if (oldKey === undefined) delete process.env.PAGAR_API_KEY; else process.env.PAGAR_API_KEY = oldKey;
    if (oldSecret === undefined) delete process.env.PAGAR_SIGNING_SECRET; else process.env.PAGAR_SIGNING_SECRET = oldSecret;
  }
});