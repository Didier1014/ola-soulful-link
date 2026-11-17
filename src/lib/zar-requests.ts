export function zarRequestTotals(payments: Array<{ status: string; amount_minor: number; fee_minor: number }>, requests: Array<{ status: string; amount_minor: number }>) {
  const sales = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount_minor) - Number(p.fee_minor), 0);
  const reserved = requests.filter(r => r.status === 'pending' || r.status === 'paid').reduce((sum, r) => sum + Number(r.amount_minor), 0);
  return { sales, reserved, requestable: Math.max(0, sales - reserved) };
}