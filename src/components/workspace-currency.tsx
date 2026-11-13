import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { currencyLabel, isWorkspaceCurrency, workspaceCurrencies, type WorkspaceCurrency } from "@/lib/workspace-currency";
import { getWorkspaceFinance } from "@/lib/workspace-finance.functions";

const CurrencyContext = createContext<{ currency: WorkspaceCurrency; setCurrency: (value: WorkspaceCurrency) => void }>({ currency: "MZN", setCurrency: () => {} });
export function WorkspaceCurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<WorkspaceCurrency>("MZN");
  useEffect(() => { try { const saved = localStorage.getItem("redox-workspace-currency"); if (isWorkspaceCurrency(saved)) setCurrency(saved); } catch {} }, []);
  const change = (value: WorkspaceCurrency) => { setCurrency(value); try { localStorage.setItem("redox-workspace-currency", value); } catch {} };
  return <CurrencyContext.Provider value={{ currency, setCurrency: change }}>{children}</CurrencyContext.Provider>;
}
export const useWorkspaceCurrency = () => useContext(CurrencyContext);
export function NationalOnly({ children, label }: { children: ReactNode; label: string }) {
  const { currency, setCurrency } = useWorkspaceCurrency();
  if (currency === "MZN") return children;
  return <section className="space-y-4"><h1 className="text-2xl font-semibold">{label}</h1><p className="text-sm text-muted-foreground">{label} disponíveis apenas em MT. Os recebimentos em {currency} ficam separados na conta do provedor.</p><Select value={currency} onValueChange={() => setCurrency("MZN")}><SelectTrigger className="w-40" aria-label="Mudar para MT"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MZN">Ver em MT</SelectItem></SelectContent></Select></section>;
}
export function WorkspaceCurrencySelector() {
  const { currency, setCurrency } = useWorkspaceCurrency();
  return <Select value={currency} onValueChange={value => { if (isWorkspaceCurrency(value)) setCurrency(value); }}><SelectTrigger aria-label="Moeda do espaço de trabalho" className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{workspaceCurrencies.map(value => <SelectItem key={value} value={value}>{currencyLabel(value)}</SelectItem>)}</SelectContent></Select>;
}
export function useWorkspaceFinance(admin = false) {
  const { currency } = useWorkspaceCurrency();
  const fetchFinance = useServerFn(getWorkspaceFinance);
  return useQuery({ queryKey: ["workspace-finance", currency, admin], queryFn: () => fetchFinance({ data: { currency, admin } }), refetchInterval: 15000, refetchOnWindowFocus: true });
}