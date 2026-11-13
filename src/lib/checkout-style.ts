export const checkoutStyles = ["normal", "offer"] as const;
export type CheckoutStyle = typeof checkoutStyles[number];
export function resolveCheckoutStyle(config: unknown): CheckoutStyle {
  return (config as { style?: unknown } | null)?.style === "offer" ? "offer" : "normal";
}