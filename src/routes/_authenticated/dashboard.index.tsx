import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, listMyTransactions } from "@/lib/transactions.functions";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet, Smartphone, Calendar, BarChart3, CircleDollarSign, ArrowUpRight,
  TrendingUp, Activity, Clock, Flame,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Overview,
});

const fmtMT = (n: number) =>
  new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(n);
const fmtMT2 = (n: number) =>
  new Intl.NumberFormat("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function Overview() {
  const fetchStats = useServerFn(getDashboardStats);
  const fetchTx = useServerFn(listMyTransactions);
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats() });
  const { data: txs = [], isLoading: txsLoading } = useQuery({ queryKey: ["tx"], queryFn: () => fetchTx() });
  const loading = statsLoading || txsLoading;

  const paid = txs.filter((t) => t.status === "paid");
  const mpesaSum = paid.filter((t) => t.method === "mpesa").reduce((s, t) => s + Number(t.amount_mzn), 0);
  const emolaSum = paid.filter((t) => t.method === "emola").reduce((s, t) => s + Number(t.amount_mzn), 0);
  const totalVol = stats?.total_volume ?? 0;
  const liquid = stats?.balance ?? 0;
  const today = paid.filter((t) => sameDay(t.created_at)).reduce((s, t) => s + Number(t.net_mzn), 0);

  const mpesaPct = totalVol ? (mpesaSum / totalVol) * 100 : 50;
  const emolaPct = totalVol ? (emolaSum / totalVol) * 100 : 50;

  const greet = greeting();
  const name = stats?.profile?.full_name || stats?.profile?.business_name || "bem-vindo";

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{greet}</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-0.5">{name}</h1>
        </div>
        <Link to="/dashboard/new-transaction" className="hidden md:inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground text-sm font-medium shadow-[0_8px_30px_-12px_color-mix(in_oklab,var(--primary)_60%,transparent)] hover:brightness-110 transition">
          Nova transação <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* HERO + SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* HERO SALDO */}
        <Card className="lg:col-span-8 relative overflow-hidden rounded-3xl border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="relative p-6 md:p-8">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" /> Saldo líquido disponível
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <p className="text-6xl md:text-7xl font-bold tracking-tight tabular-nums leading-none">
                {fmtMT(liquid)}
              </p>
              <span className="text-muted-foreground text-lg font-medium">MT</span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-success/15 text-success">
                <TrendingUp className="h-3 w-3" /> +100% vs mês anterior
              </span>
              <span className="text-xs text-muted-foreground">· Atualizado agora</span>
            </div>

            {/* Channels split bar */}
            <div className="mt-7 space-y-3">
              <div className="h-2.5 rounded-full overflow-hidden bg-muted/60 flex">
                <div className="h-full transition-all" style={{ width: `${mpesaPct}%`, background: "linear-gradient(90deg, var(--primary), var(--primary-glow))" }} />
                <div className="h-full" style={{ width: `${emolaPct}%`, background: "color-mix(in oklab, var(--foreground) 35%, transparent)" }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 tabular-nums"><Dot color="var(--primary)" /> M-Pesa <span className="text-muted-foreground">{fmtMT(mpesaSum)} MT</span></span>
                <span className="flex items-center gap-2 tabular-nums"><Dot color="color-mix(in oklab, var(--foreground) 40%, transparent)" /> e-Mola <span className="text-muted-foreground">{fmtMT(emolaSum)} MT</span></span>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-border/60 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Disponível p/ saque</p>
                <p className="text-xl font-semibold tabular-nums mt-1">{fmtMT(liquid)} <span className="text-sm text-muted-foreground font-normal">MT</span></p>
              </div>
              <Link to="/dashboard/withdrawals" className="inline-flex items-center gap-1.5 text-sm font-medium px-4 h-9 rounded-lg border border-border/60 hover:bg-muted/40 transition">
                Sacar <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </Card>

        {/* KPI SIDEBAR */}
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-3">
          <KpiCard icon={Calendar} label="Volume mensal" value={totalVol} suffix="MT" trend="+100%" trendPositive />
          <KpiCard icon={BarChart3} label="Total transacionado" value={totalVol} suffix="MT" hint={`${stats?.total_tx ?? 0} tx`} />
          <KpiCard icon={CircleDollarSign} label="Lucro do dia" value={today} suffix="MT" accent />
        </div>
      </div>

      {/* CARTEIRAS + FLUXO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-5 rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" /> Carteiras móveis
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{fmtMT(mpesaSum + emolaSum)} MT</span>
          </div>
          <div className="mt-4 space-y-2.5">
            <WalletRow img="/brands/mpesa.png" name="M-Pesa" sub="Vodacom" value={mpesaSum} pct={mpesaPct} accent />
            <WalletRow img="/brands/emola.png" name="e-Mola" sub="Movitel" value={emolaSum} pct={emolaPct} />
          </div>
        </Card>

        <Card className="lg:col-span-7 rounded-3xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Fluxo de caixa</h3>
              <p className="text-sm text-muted-foreground">Últimos 30 dias · receita líquida</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium tabular-nums">{fmtMT(paid.reduce((s,t)=>s+Number(t.net_mzn),0))} MT</span>
          </div>
          <div className="mt-4">
            <LineChart data={buildSeries(paid, 30)} />
          </div>
        </Card>
      </div>

      {/* DISTRIBUIÇÃO + TRANSAÇÕES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-4 rounded-3xl p-6">
          <h3 className="font-semibold">Distribuição</h3>
          <p className="text-sm text-muted-foreground">Por canal</p>
          <div className="mt-4 flex justify-center">
            <DonutChart mpesa={paid.filter(t=>t.method==='mpesa').length} emola={paid.filter(t=>t.method==='emola').length} />
          </div>
          <div className="mt-5 space-y-2.5 text-sm">
            <Row><span className="flex items-center gap-2"><Dot color="var(--primary)" />M-Pesa</span><span className="tabular-nums font-medium">{pct(paid.filter(t=>t.method==='mpesa').length, paid.length)}%</span></Row>
            <Row><span className="flex items-center gap-2"><Dot color="color-mix(in oklab, var(--foreground) 40%, transparent)" />e-Mola</span><span className="tabular-nums font-medium">{pct(paid.filter(t=>t.method==='emola').length, paid.length)}%</span></Row>
            <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between">
              <span className="text-muted-foreground">Falhas</span>
              <span className="text-destructive font-semibold tabular-nums">{txs.filter(t=>t.status==='failed').length} ({pct(txs.filter(t=>t.status==='failed').length, txs.length)}%)</span>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-8 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Transações recentes</h3>
            <Link to="/dashboard/transactions" className="text-sm text-muted-foreground hover:text-primary transition">Ver todas →</Link>
          </div>
          {!txs.length ? (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhuma transação ainda.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground border-b border-border/60">
                    <th className="text-left py-2.5 px-2 font-medium">Cliente</th>
                    <th className="text-left py-2.5 px-2 font-medium">Canal</th>
                    <th className="text-left py-2.5 px-2 font-medium">Valor</th>
                    <th className="text-right py-2.5 px-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.slice(0, 6).map((t) => {
                    const amt = Number(t.amount_mzn);
                    const tFee = Math.round((amt * 0.15 + 15) * 100) / 100;
                    const tNet = Math.round((amt - tFee) * 100) / 100;
                    return (
                    <tr key={t.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition">
                      <td className="py-3 px-2">
                        <div className="font-medium truncate max-w-[140px]">{t.customer_name}</div>
                        <div className="text-[11px] text-muted-foreground tabular-nums">{t.customer_phone}</div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/70">
                          {t.method === 'mpesa' && <img src="/brands/mpesa.png" alt="" className="w-4 h-4" />}
                          {t.method === 'emola' && <img src="/brands/emola.png" alt="" className="w-4 h-4" />}
                          {t.method === 'mpesa' ? 'M-PESA' : t.method === 'emola' ? 'E-MOLA' : 'CARTÃO'}
                        </span>
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap tabular-nums">
                        <span className="font-medium">{fmtMT(amt)} MT</span>
                        {t.status === 'paid' && (
                          <div className="text-[11px] text-muted-foreground leading-tight">
                            -{fmtMT2(tFee)} · <span className="text-success font-medium">+{fmtMT2(tNet)}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {t.status === 'paid' && <span className="inline-flex items-center gap-1 text-xs text-success"><Dot color="var(--success)" />Sucesso</span>}
                        {t.status === 'failed' && <span className="inline-flex items-center gap-1 text-xs text-destructive"><Dot color="var(--destructive)" />Falhou</span>}
                        {t.status === 'pending' && <span className="inline-flex items-center gap-1 text-xs text-foreground/50"><Dot color="color-mix(in oklab, var(--foreground) 40%, transparent)" />Pendente</span>}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* RESUMO */}
      <Card className="rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Resumo financeiro</h3>
          <span className="text-xs text-muted-foreground">Mês corrente</span>
        </div>
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <SumCard label="Volume mensal" value={`${fmtMT(totalVol)} MT`} />
          <SumCard label="Volume anterior" value="0 MT" />
          <SumCard label="Taxas do mês" value={`${fmtMT(totalVol * 0.039)} MT`} />
          <SumCard label="Taxas totais" value={`${fmtMT(totalVol * 0.039)} MT`} />
          <SumCard label="Receita líquida" value={`${fmtMT(liquid)} MT`} highlight />
          <SumCard label="Transações" value={String(stats?.total_tx ?? 0)} />
          <SumCard label="Falhas" value={`${txs.filter(t=>t.status==='failed').length} (${pct(txs.filter(t=>t.status==='failed').length, txs.length)}%)`} danger />
          <SumCard label="Taxa de sucesso" value={`${pct(paid.length, txs.length)}%`} />
        </ul>
      </Card>
    </div>
  );
}

/* ---------- subcomponents ---------- */

function KpiCard({ icon: Icon, label, value, suffix, trend, trendPositive, hint, accent }: { icon: React.ElementType; label: string; value: number; suffix?: string; trend?: string; trendPositive?: boolean; hint?: string; accent?: boolean }) {
  return (
    <Card className={`relative overflow-hidden rounded-2xl p-4 ${accent ? "bg-gradient-to-br from-primary/10 to-transparent border-primary/20" : ""}`}>
      <div className="flex items-start justify-between">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${accent ? "bg-primary/15 text-primary" : "bg-muted text-foreground/70"}`}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${trendPositive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{trend}</span>
        )}
        {hint && !trend && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground tabular-nums">{hint}</span>
        )}
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
        {fmtMT(value)} <span className="text-xs text-muted-foreground font-normal">{suffix}</span>
      </p>
    </Card>
  );
}

function WalletRow({ img, name, sub, value, pct, accent }: { img: string; name: string; sub: string; value: number; pct: number; accent?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl transition ${accent ? "bg-primary/5 ring-1 ring-primary/15" : "bg-muted/40"}`}>
      <img src={img} alt={name} className="h-10 w-10 shrink-0 rounded-lg" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold tabular-nums">{fmtMT(value)},<span className="text-muted-foreground text-xs">00</span></p>
        <p className="text-xs text-foreground/60 tabular-nums">{pct.toFixed(1)}%</p>
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) { return <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />; }
function Row({ children }: { children: React.ReactNode }) { return <div className="flex items-center justify-between">{children}</div>; }
function SumCard({ label, value, highlight, danger }: { label: string; value: string; highlight?: boolean; danger?: boolean }) {
  return (
    <li className={`rounded-2xl p-3.5 ${highlight ? "bg-primary/10 ring-1 ring-primary/20" : "bg-muted/40"}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold tabular-nums ${danger ? "text-destructive" : highlight ? "text-primary" : ""}`}>{value}</p>
    </li>
  );
}

function pct(n: number, d: number) { return d ? Math.round((n / d) * 1000) / 10 : 0; }
function sameDay(iso: string) { const d = new Date(iso); const n = new Date(); return d.getDate()===n.getDate() && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear(); }
function greeting() { const h = new Date().getHours(); if (h < 12) return "Bom dia"; if (h < 19) return "Boa tarde"; return "Boa noite"; }

function buildSeries(paid: { created_at: string; net_mzn: number }[], days: number) {
  const out: { label: string; v: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const v = paid.filter(p => sameDayDate(p.created_at, d)).reduce((s, p) => s + Number(p.net_mzn), 0);
    out.push({ label: `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`, v });
  }
  return out;
}
function sameDayDate(iso: string, d: Date) { const x = new Date(iso); return x.getDate()===d.getDate() && x.getMonth()===d.getMonth() && x.getFullYear()===d.getFullYear(); }

function LineChart({ data }: { data: { label: string; v: number }[] }) {
  const W = 600, H = 200, P = 32;
  const max = Math.max(1, ...data.map(d => d.v));
  const step = (W - P * 2) / Math.max(1, data.length - 1);
  const pts = data.map((d, i) => [P + i * step, H - P - (d.v / max) * (H - P * 2)] as const);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${path} L${pts[pts.length-1][0]},${H-P} L${pts[0][0]},${H-P} Z`;
  const ticks = [0.25, 0.5, 0.75, 1];
  const xLabels = [data[0]?.label, data[Math.floor(data.length/3)]?.label, data[Math.floor((2*data.length)/3)]?.label, data[data.length-1]?.label].filter(Boolean);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48">
      <defs>
        <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary-glow, var(--primary))" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <line key={i} x1={P} x2={W-P} y1={H-P - t*(H-P*2)} y2={H-P - t*(H-P*2)} stroke="var(--border)" strokeDasharray="2 4" opacity="0.5" />
      ))}
      <path d={area} fill="url(#areaGrad)" />
      <path d={path} stroke="url(#lineGrad)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="var(--primary)" />)}
      {xLabels.map((l, i) => (
        <text key={i} x={P + (i/(xLabels.length-1)) * (W - P*2)} y={H-10} fontSize="10" fill="var(--muted-foreground)" textAnchor="middle">{l}</text>
      ))}
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8 rounded-3xl p-8"><Skeleton className="h-4 w-32 mb-4" /><Skeleton className="h-16 w-72 mb-4" /><Skeleton className="h-3 w-full" /></Card>
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-3">
          {[0,1,2].map(i => <Card key={i} className="rounded-2xl p-4"><Skeleton className="h-9 w-9 rounded-xl mb-3" /><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-6 w-24" /></Card>)}
        </div>
      </div>
      {[0,1].map(i => <Card key={i} className="rounded-3xl p-6"><Skeleton className="h-4 w-32 mb-4" /><Skeleton className="h-40 w-full" /></Card>)}
    </div>
  );
}

function DonutChart({ mpesa, emola }: { mpesa: number; emola: number }) {
  const total = Math.max(1, mpesa + emola);
  const r = 70, c = 2 * Math.PI * r;
  const mPct = mpesa / total, ePct = emola / total;
  return (
    <svg viewBox="0 0 180 180" className="w-44 h-44">
      <defs>
        <linearGradient id="donutGrad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary-glow, var(--primary))" />
        </linearGradient>
      </defs>
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--border)" strokeWidth="14" opacity="0.4" />
      <circle cx="90" cy="90" r={r} fill="none" stroke="url(#donutGrad)" strokeWidth="14"
        strokeDasharray={`${c*mPct} ${c}`} transform="rotate(-90 90 90)" strokeLinecap="round" />
      <circle cx="90" cy="90" r={r} fill="none" stroke="color-mix(in oklab, var(--foreground) 25%, transparent)" strokeWidth="14"
        strokeDasharray={`${c*ePct} ${c}`} strokeDashoffset={-c*mPct} transform="rotate(-90 90 90)" strokeLinecap="round" />
      <text x="90" y="88" textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--foreground)" style={{ fontVariantNumeric: "tabular-nums" }}>{mpesa+emola}</text>
      <text x="90" y="108" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)" letterSpacing="1">TRANSAÇÕES</text>
    </svg>
  );
}
