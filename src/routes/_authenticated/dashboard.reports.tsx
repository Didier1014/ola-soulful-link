import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, listMyTransactions } from "@/lib/transactions.functions";
import { Card } from "@/components/ui/card";
import { useMemo, useState } from "react";
import {
  CircleDollarSign, ShoppingBag, CheckCircle2, Tag, Download,
  TrendingUp, TrendingDown, Activity,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard/reports")({
  component: ReportsPage,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(n);

const PERIODS = [
  { id: "today", label: "Hoje", days: 1 },
  { id: "7", label: "7 dias", days: 7 },
  { id: "30", label: "30 dias", days: 30 },
  { id: "90", label: "90 dias", days: 90 },
  { id: "12m", label: "12 meses", days: 365 },
] as const;

type PeriodId = typeof PERIODS[number]["id"];

const MPESA_COLOR = "hsl(158 76% 45%)";
const EMOLA_COLOR = "hsl(38 95% 55%)";

function ReportsPage() {
  const fetchStats = useServerFn(getDashboardStats);
  const fetchTx = useServerFn(listMyTransactions);
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats() });
  const { data: txs = [] } = useQuery({ queryKey: ["tx"], queryFn: () => fetchTx() });
  const [period, setPeriod] = useState<PeriodId>("30");

  const days = PERIODS.find((p) => p.id === period)!.days;

  const filtered = useMemo(() => {
    const cutoff = Date.now() - days * 86400_000;
    return txs.filter((t) => new Date(t.created_at).getTime() >= cutoff);
  }, [txs, days]);

  const paid = filtered.filter((t) => t.status === "paid");
  const totalVol = paid.reduce((s, t) => s + Number(t.amount_mzn), 0);
  const liquid = paid.reduce((s, t) => s + Number(t.net_mzn ?? t.amount_mzn), 0);
  const conv = filtered.length ? Math.round((paid.length / filtered.length) * 1000) / 10 : 0;
  const ticket = paid.length ? Math.round(totalVol / paid.length) : 0;
  const mpesa = paid.filter((t) => t.method === "mpesa");
  const emola = paid.filter((t) => t.method === "emola");
  const mpesaSum = mpesa.reduce((s, t) => s + Number(t.amount_mzn), 0);
  const emolaSum = emola.reduce((s, t) => s + Number(t.amount_mzn), 0);

  // previous period for delta comparison
  const prevCutoffStart = Date.now() - days * 2 * 86400_000;
  const prevCutoffEnd = Date.now() - days * 86400_000;
  const prev = txs.filter((t) => {
    const ts = new Date(t.created_at).getTime();
    return ts >= prevCutoffStart && ts < prevCutoffEnd && t.status === "paid";
  });
  const prevVol = prev.reduce((s, t) => s + Number(t.amount_mzn), 0);
  const deltaVol = delta(totalVol, prevVol);
  const deltaLiq = delta(liquid, prev.reduce((s, t) => s + Number(t.net_mzn ?? t.amount_mzn), 0));
  const deltaTicket = delta(ticket, prev.length ? Math.round(prevVol / prev.length) : 0);
  const deltaConv = delta(conv, txs.length ? Math.round((prev.length / Math.max(1, filtered.length)) * 1000) / 10 : 0);

  const series = useMemo(() => buildSeries(paid, days), [paid, days]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground flex items-center gap-2 font-mono">
            <span className="neo-live-dot" /> RELATÓRIOS · {PERIODS.find((p) => p.id === period)!.label}
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1.5">
            <span className="text-muted-foreground font-mono text-sm mr-2">//</span>Análise
          </h1>
        </div>
      </div>

      {/* Period selector */}
      <Card className="rounded-2xl neo-card p-2 flex items-center gap-1.5 flex-wrap">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`shrink-0 px-4 h-9 rounded-xl text-xs font-mono uppercase tracking-wider transition-all ${
              period === p.id
                ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[0_0_20px_-6px_var(--primary-glow)]"
                : "text-foreground/70 hover:bg-white/5 border border-white/5"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button className="ml-auto shrink-0 px-3 h-9 rounded-xl text-xs font-mono border border-white/10 bg-white/5 hover:bg-white/10 flex items-center gap-1.5">
          <Download className="h-3.5 w-3.5" /> EXPORT
        </button>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={CircleDollarSign} label="Volume" value={`${fmt(totalVol)} MT`} delta={deltaVol} />
        <StatCard icon={ShoppingBag} label="Receita líq." value={`${fmt(liquid)} MT`} delta={deltaLiq} />
        <StatCard icon={CheckCircle2} label="Conversão" value={`${conv}%`} delta={deltaConv} />
        <StatCard icon={Tag} label="Ticket médio" value={`${fmt(ticket)} MT`} delta={deltaTicket} />
      </div>

      {/* Main chart */}
      <Card className="rounded-2xl neo-card neo-corner p-5 relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 neo-grid opacity-[0.25] pointer-events-none" />
        <div className="relative flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground flex items-center gap-2">
              <Activity className="h-3 w-3 text-primary-glow" /> Volume por canal
            </h3>
            <p className="text-xs text-muted-foreground/70 mt-1">Série temporal · {series.length} pontos</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: MPESA_COLOR, boxShadow: `0 0 8px ${MPESA_COLOR}` }} />
              M-PESA
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: EMOLA_COLOR, boxShadow: `0 0 8px ${EMOLA_COLOR}` }} />
              E-MOLA
            </span>
          </div>
        </div>
        <div className="relative h-64 w-full">
          <ResponsiveContainer>
            <AreaChart data={series} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gMpesa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={MPESA_COLOR} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={MPESA_COLOR} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gEmola" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={EMOLA_COLOR} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={EMOLA_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => fmt(v)} />
              <Tooltip content={<HudTooltip />} />
              <Area type="monotone" dataKey="mpesa" stroke={MPESA_COLOR} strokeWidth={2} fill="url(#gMpesa)" />
              <Area type="monotone" dataKey="emola" stroke={EMOLA_COLOR} strokeWidth={2} fill="url(#gEmola)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Split: donut + bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl neo-card p-5">
          <h3 className="text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground">Métodos de pagamento</h3>
          <div className="mt-4 flex items-center gap-4">
            <div className="relative h-48 w-48 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={[
                    { name: "M-Pesa", value: mpesaSum },
                    { name: "e-Mola", value: emolaSum },
                  ]} innerRadius={58} outerRadius={82} paddingAngle={2} dataKey="value" stroke="none">
                    <Cell fill={MPESA_COLOR} />
                    <Cell fill={EMOLA_COLOR} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Volume</p>
                <p className="text-xl font-semibold tabular-nums text-neo-glow">{fmt(mpesaSum + emolaSum)}</p>
                <p className="text-[9px] font-mono text-muted-foreground">MZN</p>
              </div>
            </div>
            <div className="flex-1 space-y-3 text-sm">
              <LegendRow color={MPESA_COLOR} label="M-Pesa" value={mpesaSum} total={mpesaSum + emolaSum} count={mpesa.length} />
              <LegendRow color={EMOLA_COLOR} label="e-Mola" value={emolaSum} total={mpesaSum + emolaSum} count={emola.length} />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl neo-card p-5">
          <h3 className="text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground mb-3">Transações por dia</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer>
              <BarChart data={series} margin={{ top: 10, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<HudTooltip suffix="tx" />} />
                <Bar dataKey="mpesaCount" stackId="c" fill={MPESA_COLOR} radius={[0, 0, 0, 0]} />
                <Bar dataKey="emolaCount" stackId="c" fill={EMOLA_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, delta }: { icon: React.ElementType; label: string; value: string; delta: number }) {
  const up = delta >= 0;
  return (
    <Card className="rounded-2xl neo-card neo-corner p-4 relative overflow-hidden">
      <div aria-hidden className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
      <div className="relative flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-primary-glow">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">{label}</span>
      </div>
      <p className="relative mt-3 text-xl md:text-2xl font-semibold tabular-nums text-neo-glow">{value}</p>
      <p className={`relative text-[11px] font-mono mt-1 flex items-center gap-1 ${up ? "text-emerald-400" : "text-red-400"}`}>
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {up ? "+" : ""}{delta.toFixed(1)}%
      </p>
    </Card>
  );
}

function LegendRow({ color, label, value, total, count }: { color: string; label: string; value: number; total: number; count: number }) {
  const p = total ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 font-mono">
          <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          {label} · {count}
        </span>
        <span className="font-mono tabular-nums">
          <b className="text-foreground">{fmt(value)}</b>{" "}
          <span className="text-muted-foreground">({p.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: color, boxShadow: `0 0 10px ${color}` }} />
      </div>
    </div>
  );
}

function HudTooltip({ active, payload, label, suffix = "MT" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-primary/30 bg-background/95 backdrop-blur-xl px-3 py-2 shadow-[0_0_24px_-8px_var(--primary-glow)]">
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-xs font-mono tabular-nums flex items-center gap-2 mt-1">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground uppercase">{p.dataKey}</span>
          <span className="ml-auto text-foreground">{fmt(p.value)} {suffix}</span>
        </p>
      ))}
    </div>
  );
}

function delta(curr: number, prev: number) {
  if (!prev) return curr ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function buildSeries(paid: { created_at: string; amount_mzn: number; method: string }[], days: number) {
  const buckets = Math.min(days, days > 60 ? 12 : days);
  const useMonths = days > 90;
  const points = useMonths ? 12 : Math.min(days, 30);
  const out: { label: string; mpesa: number; emola: number; mpesaCount: number; emolaCount: number }[] = [];
  const today = new Date();

  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(today);
    if (useMonths) d.setMonth(today.getMonth() - i);
    else d.setDate(today.getDate() - i);

    const label = useMonths
      ? d.toLocaleDateString("pt-MZ", { month: "short" })
      : d.toLocaleDateString("pt-MZ", { day: "2-digit", month: "2-digit" });

    const inBucket = paid.filter((p) => {
      const pd = new Date(p.created_at);
      return useMonths
        ? pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear()
        : pd.toDateString() === d.toDateString();
    });

    const mp = inBucket.filter((p) => p.method === "mpesa");
    const em = inBucket.filter((p) => p.method === "emola");
    out.push({
      label,
      mpesa: mp.reduce((s, p) => s + Number(p.amount_mzn), 0),
      emola: em.reduce((s, p) => s + Number(p.amount_mzn), 0),
      mpesaCount: mp.length,
      emolaCount: em.length,
    });
  }
  void buckets;
  return out;
}
