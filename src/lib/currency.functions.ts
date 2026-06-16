import { createServerFn } from "@tanstack/react-start";

type ExchangeRates = Record<string, number>;

let cache: { rates: ExchangeRates; fetchedAt: number } | null = null;
const CACHE_TTL = 3_600_000; // 60 minutes

export const getExchangeRates = createServerFn({ method: "GET" }).handler(async () => {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL) {
    return cache.rates;
  }
  try {
    // Free plan — no API key needed for basic usage
    const res = await fetch("https://open.er-api.com/v6/latest/MZN");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rates: ExchangeRates = {};
    for (const code of ["USD", "BRL", "ZAR", "EUR", "MZN"]) {
      rates[code] = json.rates?.[code] ?? 1;
    }
    rates.MZN = 1;
    cache = { rates, fetchedAt: now };
    return rates;
  } catch {
    // Return fallback rates on error
    return { MZN: 1, USD: 0.015, BRL: 0.085, ZAR: 0.28, EUR: 0.014 } as ExchangeRates;
  }
});

export async function convertAmount(
  amountMZN: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<number> {
  if (fromCurrency === toCurrency) return amountMZN;
  const rates = await getExchangeRates();
  const fromRate = rates[fromCurrency] ?? 1;
  const toRate = rates[toCurrency] ?? 1;
  return (amountMZN / fromRate) * toRate;
}
