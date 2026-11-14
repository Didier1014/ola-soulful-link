export function internationalSaleNotice(payment: { currency: string; amount_minor: number; customer_name?: string | null }, productName: string) {
  const amount = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: payment.currency }).format(Number(payment.amount_minor) / 100);
  return { title: `Sale confirmed · ${payment.currency}`, body: `${amount} — ${productName}${payment.customer_name ? ` · ${payment.customer_name}` : ''}`, amount };
}