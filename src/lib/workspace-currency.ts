export const workspaceCurrencies = ["MZN", "ZAR", "USD", "EUR"] as const;
export type WorkspaceCurrency = typeof workspaceCurrencies[number];
export const currencyLabel = (currency: WorkspaceCurrency) => currency === "MZN" ? "MT" : currency;
export const isWorkspaceCurrency = (value: unknown): value is WorkspaceCurrency => workspaceCurrencies.some(currency => currency === value);

export type WorkspacePayment = {
  id: string; currency: WorkspaceCurrency; amount: number; fee: number; net: number;
  status: string; created_at: string; method: string; customer_name: string | null;
  customer_phone: string | null; customer_email: string | null; external_ref: string | null;
  product_id: string | null; user_id: string; provider: string;
};

export function currencyPayments(rows: WorkspacePayment[], currency: WorkspaceCurrency) {
  return rows.filter(row => row.currency === currency);
}
export function paymentTotals(rows: WorkspacePayment[]) {
  const paid = rows.filter(row => row.status === "paid");
  const sum = (key: "amount" | "fee" | "net") => paid.reduce((total, row) => total + Math.round(row[key] * 100), 0) / 100;
  return { volume: sum("amount"), fees: sum("fee"), net: sum("net"), paid: paid.length, count: rows.length };
}