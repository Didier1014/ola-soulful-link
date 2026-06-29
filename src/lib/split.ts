// Split de pagamentos RedoxPay — cálculo determinístico.
// Brief: taxa plataforma 15% + 15 MT; custo RLX 12% + 12 MT; lucro = 3% + 3 MT;
// merchant recebe bruto - taxa plataforma.

export const PROVIDERS = {
  mpesa: "847389419", // CHRIS
  emola: "875844372", // BERNARDIN
} as const;

export type SplitMethod = "mpesa" | "emola";

export interface SplitBreakdown {
  gross: number;
  platformFee: number;
  rlxCost: number;
  ownerProfit: number;
  merchantNet: number;
  providerPhone: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcSplit(amount: number, method: SplitMethod): SplitBreakdown {
  const platformFee = r2(amount * 0.15 + 15);
  const rlxCost = r2(amount * 0.12 + 12);
  const ownerProfit = r2(platformFee - rlxCost);
  const merchantNet = r2(amount - platformFee);
  return {
    gross: r2(amount),
    platformFee,
    rlxCost,
    ownerProfit,
    merchantNet,
    providerPhone: method === "mpesa" ? PROVIDERS.mpesa : PROVIDERS.emola,
  };
}

// Valor mínimo: merchant_net não pode ficar ≤ 0. 15% + 15 = amount → amount ≈ 17.6.
// Brief pede 50 MT como mínimo prático.
export const MIN_AMOUNT = 50;
