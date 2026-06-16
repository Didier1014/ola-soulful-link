import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyTransactions, checkTransactionStatus } from "@/lib/transactions.functions";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/transactions")({
  component: TxPage,
});

const fmtMT = (n: number) => `${new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(n)} MT`;
const fmtMT2 = (n: number) => new Intl.NumberFormat("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function TxPage() {
  const fetchTx = useServerFn(listMyTransactions);
  const checkStatus = useServerFn(checkTransactionStatus);
  const qc = useQueryClient();
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["tx"],
    queryFn: () => fetchTx(),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
  const [filter, setFilter] = useState<"all"|"paid"|"pending"|"failed">("all");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const filtered = data.filter(t => filter === "all" || t.status === filter);

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      const r = await checkStatus({ data: { transaction_id: id } });
      if (r.status === "paid") toast.success("Pagamento confirmado!");
      else if (r.status === "failed") toast.error("Pagamento falhou");
      else toast.info("Ainda pendente no gateway");
      qc.invalidateQueries({ queryKey: ["tx"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao verificar");
    } finally {
      setVerifyingId(null);
    }
  };


  return (
    <div className="space-y-4">
      <div className="px-1 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transações</h1>
          <p className="text-sm text-muted-foreground">{data.length} no total {isFetching && <span className="ml-1 opacity-60">· atualizando…</span>}</p>
        </div>
        <button onClick={()=>refetch()} className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card">Atualizar</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {([["all","Todas"],["paid","Sucesso"],["pending","Pendente"],["failed","Falhou"]] as const).map(([k,l]) => (
          <button key={k} onClick={()=>setFilter(k)} className={`shrink-0 px-4 py-2 rounded-xl text-xs font-medium ${filter===k ? "bg-foreground text-background" : "bg-card border border-border"}`}>{l}</button>
        ))}
      </div>

      <Card className="rounded-2xl shadow-sm divide-y divide-border">
        {isLoading && <p className="p-8 text-center text-muted-foreground text-sm">Carregando...</p>}
        {!isLoading && !filtered.length && <p className="p-8 text-center text-muted-foreground text-sm">Nenhuma transação.</p>}
        {filtered.map(t => {
          const amt = Number(t.amount_mzn);
          const tFee = Math.round((amt * 0.15 + 15) * 100) / 100;
          const tNet = Math.round((amt - tFee) * 100) / 100;
          return (
          <div key={t.id} className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold ${t.method==='mpesa' ? 'bg-rose-50 text-[#e11d48]' : t.method==='emola' ? 'bg-amber-50 text-[#f59e0b]' : 'bg-secondary'}`}>
              {t.method==='mpesa' ? 'MP' : t.method==='emola' ? 'EM' : 'CC'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{t.customer_name}</p>
              <p className="text-xs text-muted-foreground">{t.customer_phone} · {new Date(t.created_at).toLocaleString("pt-MZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
              {t.status === 'paid' && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Taxa (15%+15): -{fmtMT2(tFee)} · <span className="text-emerald-600 font-medium">Recebe: +{fmtMT2(tNet)}</span>
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-semibold">{fmtMT(amt)}</p>
              {t.status === 'paid' && <p className="text-xs text-emerald-600">● Sucesso</p>}
              {t.status === 'failed' && <p className="text-xs text-[#e11d48]">● Falhou</p>}
              {t.status === 'pending' && <p className="text-xs text-amber-600">● Pendente</p>}
            </div>
          </div>
        )})}
      </Card>
    </div>
  );
}
