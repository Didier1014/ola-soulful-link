import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyTransactions } from "@/lib/transactions.functions";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, RefreshCw, Copy, TrendingUp, Activity, CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/transactions")({
  component: TxPage,
});

const fmtMT = (n: number) => `${new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(n)} MT`;
const fmtMT2 = (n: number) => new Intl.NumberFormat("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function TxPage() {
  const fetchTx = useServerFn(listMyTransactions);
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["tx"],
    queryFn: () => fetchTx(),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "failed">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (!term) return true;
      return (
        t.customer_name?.toLowerCase().includes(term) ||
        t.customer_phone?.toLowerCase().includes(term) ||
        t.customer_email?.toLowerCase().includes(term) ||
        t.external_ref?.toLowerCase().includes(term) ||
        t.id.toLowerCase().includes(term)
      );
    });
  }, [data, filter, q]);

  const stats = useMemo(() => {
    const paid = data.filter((t) => t.status === "paid");
    const pending = data.filter((t) => t.status === "pending");
    const failed = data.filter((t) => t.status === "failed");
    const volume = paid.reduce((s, t) => s + Number(t.amount_mzn), 0);
    const net = paid.reduce((s, t) => {
      const amt = Number(t.amount_mzn);
      const fee = Math.round((amt * 0.15 + 15) * 100) / 100;
      return s + (amt - fee);
    }, 0);
    return { paid: paid.length, pending: pending.length, failed: failed.length, volume, net };
  }, [data]);

  const counts = {
    all: data.length,
    paid: stats.paid,
    pending: stats.pending,
    failed: stats.failed,
  } as const;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="neo-chip">
              <Activity className="h-3 w-3" /> LIVE
            </span>
            {isFetching && <span className="text-[10px] text-muted-foreground uppercase tracking-widest">sync…</span>}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neo-glow">Transações</h1>
          <p className="text-sm text-muted-foreground">Fluxo em tempo real · {data.length} operações</p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl neo-card hover:brightness-110 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Volume pago" value={fmtMT(stats.volume)} icon={<TrendingUp className="h-4 w-4" />} tone="emerald" />
        <KpiCard label="Líquido" value={fmtMT(stats.net)} icon={<CheckCircle2 className="h-4 w-4" />} tone="primary" />
        <KpiCard label="Pendentes" value={String(stats.pending)} icon={<Clock className="h-4 w-4" />} tone="amber" />
        <KpiCard label="Falhadas" value={String(stats.failed)} icon={<XCircle className="h-4 w-4" />} tone="rose" />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar por cliente, telefone, ref…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl neo-card text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {([
            ["all", "Todas"],
            ["paid", "Sucesso"],
            ["pending", "Pendente"],
            ["failed", "Falhou"],
          ] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition ${
                filter === k
                  ? "bg-foreground text-background shadow-lg"
                  : "neo-card hover:brightness-110"
              }`}
            >
              {l}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${filter === k ? "bg-background/20" : "bg-muted/60 text-muted-foreground"}`}>
                {counts[k]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile — card list */}
      <div className="lg:hidden neo-card neo-corner rounded-2xl divide-y divide-border/50 overflow-hidden">
        {isLoading && <p className="p-8 text-center text-muted-foreground text-sm">Carregando…</p>}
        {!isLoading && !filtered.length && <p className="p-8 text-center text-muted-foreground text-sm">Nenhuma transação.</p>}
        {filtered.map((t) => {
          const amt = Number(t.amount_mzn);
          const tFee = Math.round((amt * 0.15 + 15) * 100) / 100;
          const tNet = Math.round((amt - tFee) * 100) / 100;
          return (
            <div key={t.id} className="p-4 flex items-center gap-3 hover:bg-muted/20 transition">
              <MethodBadge method={t.method} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{t.customer_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {t.customer_phone} · {new Date(t.created_at).toLocaleString("pt-MZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
                {t.status === "paid" && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Taxa -{fmtMT2(tFee)} · <span className="text-emerald-500 font-medium">+{fmtMT2(tNet)}</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums">{fmtMT(amt)}</p>
                <StatusPill status={t.status} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop — full table */}
      <div className="hidden lg:block neo-card neo-corner rounded-2xl overflow-hidden">
        {isLoading ? (
          <p className="p-10 text-center text-muted-foreground text-sm">Carregando…</p>
        ) : !filtered.length ? (
          <p className="p-10 text-center text-muted-foreground text-sm">Nenhuma transação.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border/60 bg-muted/20">
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
                    <tr key={t.id} className="border-b border-border/40 last:border-0 hover:bg-primary/5 transition">
                      <td className="py-3 px-3">
                        <code className="text-[11px] text-muted-foreground font-mono">{t.id.slice(0, 8)}</code>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium truncate max-w-[180px]">{t.customer_name}</div>
                        {t.customer_email && <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">{t.customer_email}</div>}
                      </td>
                      <td className="py-3 px-3 tabular-nums text-muted-foreground">{t.customer_phone || "—"}</td>
                      <td className="py-3 px-3"><MethodBadge method={t.method} compact /></td>
                      <td className="py-3 px-3 text-right tabular-nums font-semibold text-neo-glow">{fmtMT(amt)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
                        {t.status === "paid" ? <>-{fmtMT2(tFee)} MT</> : "—"}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        {t.status === "paid" ? <span className="text-emerald-500 font-semibold">+{fmtMT2(tNet)} MT</span> : "—"}
                      </td>
                      <td className="py-3 px-3">
                        {t.external_ref ? (
                          <code className="text-[11px] font-mono text-muted-foreground" title={t.external_ref}>
                            {t.external_ref.slice(0, 14)}{t.external_ref.length > 14 ? "…" : ""}
                          </code>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                        <div>{created.toLocaleDateString("pt-MZ")}</div>
                        <div className="opacity-70">{created.toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
                      </td>
                      <td className="py-3 px-3 text-center"><StatusPill status={t.status} /></td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => { navigator.clipboard.writeText(t.id); toast.success("ID copiado"); }}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-md border border-border/60 bg-card hover:bg-muted/40 transition"
                        >
                          <Copy className="h-3 w-3" /> ID
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "primary" | "emerald" | "amber" | "rose" }) {
  const toneCls = {
    primary: "text-primary bg-primary/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    rose: "text-rose-500 bg-rose-500/10",
  }[tone];
  return (
    <div className="neo-card neo-corner rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <span className={`h-7 w-7 rounded-lg inline-flex items-center justify-center ${toneCls}`}>{icon}</span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-neo-glow">{value}</p>
    </div>
  );
}

function MethodBadge({ method, compact }: { method: string; compact?: boolean }) {
  const map: Record<string, { label: string; short: string; cls: string }> = {
    mpesa:  { label: "M-PESA",  short: "MP", cls: "bg-rose-500/10 text-rose-500 border-rose-500/30" },
    emola:  { label: "E-MOLA",  short: "EM", cls: "bg-amber-500/10 text-amber-500 border-amber-500/30" },
    card:   { label: "CARTÃO",  short: "CC", cls: "bg-primary/10 text-primary border-primary/30" },
  };
  const m = map[method] ?? { label: method.toUpperCase(), short: method.slice(0, 2).toUpperCase(), cls: "bg-secondary text-foreground/70 border-border" };
  if (compact) {
    return <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md border ${m.cls}`}>{m.label}</span>;
  }
  return (
    <div className={`h-10 w-10 rounded-xl border flex items-center justify-center text-xs font-bold ${m.cls}`}>
      {m.short}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "paid") return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_currentColor]" /> Sucesso</span>;
  if (status === "failed") return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500"><span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_currentColor]" /> Falhou</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-500"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_currentColor] animate-pulse" /> Pendente</span>;
}
