import { Button } from "@/components/ui/button";
import { useWorkspaceCurrency } from "./workspace-currency";
import { currencyLabel, workspaceCurrencies } from "@/lib/workspace-currency";
export function FinanceCurrencyTabs() {
  const { currency, setCurrency } = useWorkspaceCurrency();
  return <div className="flex flex-wrap items-center gap-3"><span className="text-xs text-muted-foreground">Moeda</span><div className="dash-period flex items-center gap-1" role="group" aria-label="Moeda dos movimentos">{workspaceCurrencies.map(value => <Button key={value} size="sm" variant="ghost" aria-pressed={currency === value} onClick={() => setCurrency(value)} className={currency === value ? "dash-period-active" : "text-muted-foreground"}>{currencyLabel(value)}</Button>)}</div></div>;
}