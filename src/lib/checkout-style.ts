export const checkoutStyles = ["normal", "offer", "escale"] as const;
export type CheckoutStyle = typeof checkoutStyles[number];
export function resolveCheckoutStyle(config: unknown): CheckoutStyle {
  const style = (config as { style?: unknown } | null)?.style;
  return style === "offer" || style === "escale" ? style : "normal";
}
