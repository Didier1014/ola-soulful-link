// Cálculo central de taxas RedoxPay.
// - Taxa cobrada ao vendedor (cliente RedoxPay): 15% + 15 MT
// - O processador (PayBlack) devolve fee_amount/payout_amount em cada transacção
//   e o saldo real é consultado via /api/balance — ver src/lib/payblack.server.ts.
export const SELLER_FEE_PCT = 0.15;
export const SELLER_FEE_FIXED = 15;

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcFee(amount: number) {
  const seller_fee = r2(amount * SELLER_FEE_PCT + SELLER_FEE_FIXED);
  const seller_net = r2(amount - seller_fee);
  return { seller_fee, seller_net };
}
