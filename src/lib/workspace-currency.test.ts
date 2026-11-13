import { describe, expect, it } from "vitest";
import { currencyPayments, paymentTotals, type WorkspacePayment } from "./workspace-currency";
const row = (currency: WorkspacePayment["currency"], amount: number, status = "paid"): WorkspacePayment => ({ id: currency + status, currency, amount, fee: amount * .08, net: amount * .92, status, created_at: "2026-11-13T00:00:00Z", method: "card", customer_name: null, customer_phone: null, customer_email: null, external_ref: null, product_id: null, user_id: "owner", provider: "paystack" });
describe("workspace currency divisions", () => {
  const rows = [row("MZN", 300), row("ZAR", 10), row("USD", 20), row("EUR", 30), row("ZAR", 100, "test_paid"), row("ZAR", 50, "pending")];
  it("isolates MT from ZAR and USD without currency conversion", () => { expect(paymentTotals(currencyPayments(rows, "MZN")).volume).toBe(300); expect(paymentTotals(currencyPayments(rows, "ZAR")).volume).toBe(10); expect(paymentTotals(currencyPayments(rows, "USD")).volume).toBe(20); expect(paymentTotals(currencyPayments(rows, "EUR")).volume).toBe(30); });
  it("excludes test and pending payments from confirmed receipts", () => expect(paymentTotals(currencyPayments(rows, "ZAR"))).toEqual({ volume: 10, fees: .8, net: 9.2, paid: 1, count: 3 }));
});