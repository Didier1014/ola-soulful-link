import { z } from "zod";

export const currencyChoice = z.discriminatedUnion("checkout_provider", [
  z.object({ checkout_provider: z.literal("national"), currency: z.literal("MZN") }),
  z.object({ checkout_provider: z.literal("paystack"), currency: z.literal("ZAR") }),
  z.object({ checkout_provider: z.literal("stripe"), currency: z.enum(["EUR", "USD"]) }),
]);

export function productPricing(input: { checkout_provider?: string; currency?: string; price_amount?: number | null; price_mzn: number }) {
  const choice = currencyChoice.parse({ checkout_provider: input.checkout_provider ?? "national", currency: input.currency ?? "MZN" });
  const amount = z.number().finite().min(0).max(1_000_000).parse(input.price_amount ?? input.price_mzn);
  if (choice.checkout_provider !== "national" && amount <= 0) throw new Error("O preço internacional deve ser maior que zero");
  return { ...choice, price_amount: amount, price_mzn: choice.checkout_provider === "national" ? amount : 0 };
}

export function requireNationalProduct(product: { checkout_provider?: string }) {
  if (product.checkout_provider && product.checkout_provider !== "national") throw new Error("Este produto utiliza um checkout internacional");
}

export function internationalAmounts(amount: number) {
  const minor = Math.round(z.number().finite().positive().max(1_000_000).parse(amount) * 100);
  if (!Number.isSafeInteger(minor) || minor < 1) throw new Error("Preço inválido");
  const fee = Math.round(minor * 0.08);
  return { amount_minor: minor, fee_minor: fee, net_minor: minor - fee };
}

export function verifiedInternationalState(expected: { reference: string; amount_minor: number; currency: string }, payment: { reference?: string; amount?: number; currency?: string; status?: string; domain?: string }) {
  if (payment.reference !== expected.reference || payment.amount !== Number(expected.amount_minor) || payment.currency !== expected.currency) throw new Error("Os valores confirmados pelo provedor não correspondem à compra");
  if (payment.status === "success") {
    if (payment.domain !== "live" && payment.domain !== "test") throw new Error("Ambiente de pagamento não confirmado");
    return payment.domain === "live" ? "paid" : "test_paid";
  }
  return ["failed", "abandoned", "reversed"].includes(payment.status ?? "") ? "failed" : "pending";
}

export function formatProductPrice(p: { price_amount?: number | null; price_mzn: number; currency?: string }) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: p.currency ?? "MZN" }).format(Number(p.price_amount ?? p.price_mzn));
}