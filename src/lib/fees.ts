// Cálculo central de taxas RedoxPay.
// - Custo do provedor RLX (interno): 10% + 10 MT
// - Taxa cobrada ao vendedor (cliente RedoxPay): 15% + 15 MT
// - Margem da plataforma = seller_fee - rlx_cost
export const SELLER_FEE_PCT = 0.15;
export const SELLER_FEE_FIXED = 15;
export const RLX_COST_PCT = 0.10;
export const RLX_COST_FIXED = 10;

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcFee(amount: number) {
  const seller_fee = r2(amount * SELLER_FEE_PCT + SELLER_FEE_FIXED);
  const rlx_cost = r2(amount * RLX_COST_PCT + RLX_COST_FIXED);
  const admin_margin = r2(seller_fee - rlx_cost);
  const seller_net = r2(amount - seller_fee);
  return { seller_fee, rlx_cost, admin_margin, seller_net };
}
