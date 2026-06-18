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

      {/* Mobile / tablet — card list */}
      <Card className="lg:hidden rounded-2xl shadow-sm divide-y divide-border">
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
              {t.status === 'pending' && (
                <button
                  disabled={verifyingId === t.id}
                  onClick={() => handleVerify(t.id)}
                  className="mt-1 text-[11px] px-2 py-1 rounded-md border border-border bg-card disabled:opacity-50"
                >
                  {verifyingId === t.id ? "A verificar…" : "Verificar"}
                </button>
              )}
            </div>
          </div>
        )})}
      </Card>

      {/* Desktop — full table */}
      <Card className="hidden lg:block rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-muted-foreground text-sm">Carregando...</p>
        ) : !filtered.length ? (
          <p className="p-8 text-center text-muted-foreground text-sm">Nenhuma transação.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-3 font-medium">ID</th>
                  <th className="text-left py-3 px-3 font-medium">Cliente</th>
                  <th className="text-left py-3 px-3 font-medium">Contacto</th>
                  <th className="text-left py-3 px-3 font-medium">Canal</th>
                  <th className="text-right py-3 px-3 font-medium">Valor</th>
                  <th className="text-right py-3 px-3 font-medium">Taxa</th>
                  <th className="text-right py-3 px-3 font-medium">Líquido</th>
                  <th className="text-left py-3 px-3 font-medium">Ref. Gateway</th>
                  <th className="text-left py-3 px-3 font-medium">Data</th>
                  <th className="text-center py-3 px-3 font-medium">Estado</th>
                  <th className="text-right py-3 px-3 font-medium">Acção</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const amt = Number(t.amount_mzn);
                  const tFee = Math.round((amt * 0.15 + 15) * 100) / 100;
                  const tNet = Math.round((amt - tFee) * 100) / 100;
                  const created = new Date(t.created_at);
                  return (
                    <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition">
                      <td className="py-3 px-3">
                        <code className="text-[11px] text-muted-foreground font-mono">{t.id.slice(0, 8)}</code>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium truncate max-w-[180px]">{t.customer_name}</div>
                        {t.customer_email && <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">{t.customer_email}</div>}
                      </td>
                      <td className="py-3 px-3 tabular-nums text-muted-foreground">{t.customer_phone || "—"}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md ${t.method==='mpesa' ? 'bg-rose-500/10 text-rose-500' : t.method==='emola' ? 'bg-amber-500/10 text-amber-500' : 'bg-secondary text-foreground/70'}`}>
                          {t.method === 'mpesa' ? 'M-PESA' : t.method === 'emola' ? 'E-MOLA' : 'CARTÃO'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-semibold">{fmtMT(amt)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
                        {t.status === 'paid' ? <>-{fmtMT2(tFee)} MT</> : '—'}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        {t.status === 'paid' ? <span className="text-emerald-600 font-semibold">+{fmtMT2(tNet)} MT</span> : '—'}
                      </td>
                      <td className="py-3 px-3">
                        {t.external_ref ? (
                          <code className="text-[11px] font-mono text-muted-foreground" title={t.external_ref}>{t.external_ref.slice(0, 14)}{t.external_ref.length > 14 ? '…' : ''}</code>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                        <div>{created.toLocaleDateString("pt-MZ")}</div>
                        <div className="opacity-70">{created.toLocaleTimeString("pt-MZ", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {t.status === 'paid' && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">● Sucesso</span>}
                        {t.status === 'failed' && <span className="inline-flex items-center gap-1 text-xs font-medium text-[#e11d48]">● Falhou</span>}
                        {t.status === 'pending' && <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">● Pendente</span>}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {t.status === 'pending' ? (
                          <button
                            disabled={verifyingId === t.id}
                            onClick={() => handleVerify(t.id)}
                            className="text-[11px] px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-muted/40 disabled:opacity-50 transition"
                          >
                            {verifyingId === t.id ? "A verificar…" : "Verificar"}
                          </button>
                        ) : (
                          <button
                            onClick={() => { navigator.clipboard.writeText(t.id); toast.success("ID copiado"); }}
                            className="text-[11px] px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-muted/40 transition"
                          >
                            Copiar ID
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
