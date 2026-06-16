import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, listMyTransactions } from "@/lib/transactions.functions";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail, Smartphone, Calendar, BarChart3, CircleDollarSign, ArrowUpRight,
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
    <div className="space-y-4">
      <h1 className="text-[22px] font-semibold tracking-tight px-1">
        {greet}, <span>{name}</span>
      </h1>

      {/* SALDO LÍQUIDO */}
      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-pink-300 via-orange-300 to-violet-400" />
        <div className="p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> Saldo líquido
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-4xl font-semibold tracking-tight">{fmtMT(liquid)}</p>
            <span className="text-muted-foreground text-sm">MT</span>
          </div>
          <Badge tone="success" className="mt-2 inline-flex">↗ +100% <span className="text-muted-foreground font-normal ml-1">vs mês anterior</span></Badge>

          <div className="mt-5 h-2 rounded-full overflow-hidden bg-muted flex">
            <div className="h-full rounded-l-full" style={{ width: `${mpesaPct}%`, background: "var(--primary)" }} />
            <div className="h-full rounded-r-full" style={{ width: `${emolaPct}%`, background: "color-mix(in oklab, var(--foreground) 30%, transparent)" }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5"><Dot color="var(--primary)" /> M-Pesa {fmtMT(mpesaSum)} MT</span>
            <span className="flex items-center gap-1.5"><Dot color="color-mix(in oklab, var(--foreground) 40%, transparent)" /> e-Mola {fmtMT(emolaSum)} MT</span>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Disponível p/ saque</span>
            <span className="font-semibold">{fmtMT(liquid)} MT</span>
          </div>
        </div>
      </Card>

      {/* CARTEIRAS */}
      <Card className="rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <Smartphone className="h-3.5 w-3.5" /> Carteiras móveis
        </div>
        <div className="mt-3 space-y-2">
          <WalletRow img="/brands/mpesa.png" name="M-Pesa" sub="Vodacom" value={mpesaSum} pct={mpesaPct} />
          <WalletRow img="/brands/emola.png" name="e-Mola" sub="Movitel" value={emolaSum} pct={emolaPct} />
        </div>
      </Card>

      {/* KPI rows */}
      <KpiRow icon={Calendar} label="Volume mensal" value={`${fmtMT(totalVol)} MT`} trail={<Badge tone="success">↗ +100%</Badge>} />
      <KpiRow icon={BarChart3} label="Total transacionado" value={`${fmtMT(totalVol)} MT`} trail={<span className="text-xs text-muted-foreground bg-secondary rounded-full px-2.5 py-1">{stats?.total_tx ?? 0} tx</span>} />
      <KpiRow icon={CircleDollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Lucro líquido do dia" value={`${fmtMT(today)} MT`} />

      {/* FLUXO DE CAIXA */}
      <Card className="rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold">Fluxo de caixa</h3>
        <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
        <div className="mt-4">
          <LineChart data={buildSeries(paid, 30)} />
        </div>
      </Card>

      {/* DISTRIBUIÇÃO */}
      <Card className="rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold">Distribuição</h3>
        <div className="mt-4 flex justify-center">
          <DonutChart mpesa={paid.filter(t=>t.method==='mpesa').length} emola={paid.filter(t=>t.method==='emola').length} />
        </div>
        <div className="mt-5 space-y-2 text-sm">
          <Row><span className="flex items-center gap-2"><Dot color="var(--primary)" />M-Pesa</span><span>{pct(paid.filter(t=>t.method==='mpesa').length, paid.length)}%</span></Row>
          <Row><span className="flex items-center gap-2"><Dot color="color-mix(in oklab, var(--foreground) 40%, transparent)" />e-Mola</span><span>{pct(paid.filter(t=>t.method==='emola').length, paid.length)}%</span></Row>
          <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
            <span className="text-muted-foreground">Falhas</span>
            <span className="text-destructive font-semibold">{txs.filter(t=>t.status==='failed').length} ({pct(txs.filter(t=>t.status==='failed').length, txs.length)}%)</span>
          </div>
        </div>
      </Card>

      {/* TRANSAÇÕES RECENTES */}
      <Card className="rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Transações recentes</h3>
          <Link to="/dashboard/transactions" className="text-sm text-muted-foreground hover:text-foreground">Ver todas</Link>
        </div>
        {!txs.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transação ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left py-2 font-medium">Cliente</th>
                <th className="text-left py-2 font-medium">Canal</th>
                <th className="text-left py-2 font-medium">Valor</th>
                <th className="text-right py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {txs.slice(0, 6).map((t) => {
                const amt = Number(t.amount_mzn);
                const tFee = Math.round((amt * 0.15 + 15) * 100) / 100;
                const tNet = Math.round((amt - tFee) * 100) / 100;
                return (
                <tr key={t.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-2">
                    <div className="font-medium truncate max-w-[100px]">{t.customer_name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.customer_phone}</div>
                  </td>
                  <td className="py-3 pr-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/70">
                      {t.method === 'mpesa' && <img src="/brands/mpesa.png" alt="" className="w-4 h-4" />}
                      {t.method === 'emola' && <img src="/brands/emola.png" alt="" className="w-4 h-4" />}
                      {t.method === 'mpesa' ? 'M-PESA' : t.method === 'emola' ? 'E-MOLA' : 'CARTÃO'}
                    </span>
                  </td>
                  <td className="py-3 pr-2 whitespace-nowrap">
                    <span>{fmtMT(amt)} MT</span>
                    {t.status === 'paid' && (
                      <div className="text-[11px] text-muted-foreground leading-tight">
                        Taxa: -{fmtMT2(tFee)} MT · <span className="text-emerald-600 font-medium">+{fmtMT2(tNet)} MT</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {t.status === 'paid' && <span className="inline-flex items-center gap-1 text-xs text-success"><Dot color="var(--success)" />Sucesso</span>}
                    {t.status === 'failed' && <span className="inline-flex items-center gap-1 text-xs text-destructive"><Dot color="var(--destructive)" />Falhou</span>}
                    {t.status === 'pending' && <span className="inline-flex items-center gap-1 text-xs text-foreground/50"><Dot color="color-mix(in oklab, var(--foreground) 40%, transparent)" />Pendente</span>}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </Card>

      {/* RESUMO */}
      <Card className="rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold mb-3">Resumo</h3>
        <ul className="text-sm divide-y divide-border">
          <SumLine label="Volume mensal" value={`${fmtMT(totalVol)} MT`} />
          <SumLine label="Volume anterior" value="0 MT" />
          <SumLine label="Taxas do mês" value={`${fmtMT(totalVol * 0.039)} MT`} />
          <SumLine label="Taxas totais" value={`${fmtMT(totalVol * 0.039)} MT`} />
          <SumLine label="Receita líquida" value={`${fmtMT(liquid)} MT`} />
          <SumLine label="Transações" value={String(stats?.total_tx ?? 0)} />
          <SumLine label="Falhas" value={`${txs.filter(t=>t.status==='failed').length} (${pct(txs.filter(t=>t.status==='failed').length, txs.length)}%)`} valueClass="text-destructive font-semibold" />
        </ul>
      </Card>
    </div>
  );
}

/* ---------- subcomponents ---------- */

function KpiRow({ icon: Icon, label, value, trail, iconBg = "bg-secondary", iconColor = "text-foreground" }: { icon: React.ElementType; label: string; value: string; trail?: React.ReactNode; iconBg?: string; iconColor?: string; }) {
  return (
    <Card className="rounded-2xl shadow-sm p-4 flex items-center gap-4">
      <div className={`${iconBg} ${iconColor} h-10 w-10 rounded-xl flex items-center justify-center`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold mt-0.5">{value.split(" ")[0]} <span className="text-muted-foreground text-sm font-normal">{value.split(" ").slice(1).join(" ")}</span></p>
      </div>
      {trail}
    </Card>
  );
}

function WalletRow({ img, name, sub, value, pct }: { img: string; name: string; sub: string; value: number; pct: number }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
      <img src={img} alt={name} className="h-10 w-10 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold">{fmtMT(value)},<span className="text-muted-foreground text-xs">00</span></p>
        <p className="text-xs text-foreground/60">{pct.toFixed(1)}%</p>
      </div>
    </div>
  );
}

function Badge({ tone, children, className = "" }: { tone: "success" | "muted"; children: React.ReactNode; className?: string }) {
  const cls = tone === "success" ? "bg-success/15 text-success" : "bg-secondary text-foreground";
  return <span className={`text-xs font-medium px-2 py-1 rounded-md ${cls} ${className}`}>{children}</span>;
}

function Dot({ color }: { color: string }) { return <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />; }
function Row({ children }: { children: React.ReactNode }) { return <div className="flex items-center justify-between">{children}</div>; }
function SumLine({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return <li className="flex items-center justify-between py-2.5"><span className="text-muted-foreground">{label}</span><span className={valueClass}>{value}</span></li>;
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
  const W = 320, H = 160, P = 28;
  const max = Math.max(1, ...data.map(d => d.v));
  const step = (W - P * 2) / Math.max(1, data.length - 1);
  const pts = data.map((d, i) => [P + i * step, H - P - (d.v / max) * (H - P * 2)] as const);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${path} L${pts[pts.length-1][0]},${H-P} L${pts[0][0]},${H-P} Z`;
  const ticks = [0.25, 0.5, 0.75, 1];
  const xLabels = [data[0]?.label, data[Math.floor(data.length/3)]?.label, data[Math.floor((2*data.length)/3)]?.label, data[data.length-1]?.label].filter(Boolean);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={P} x2={W-P} y1={H-P - t*(H-P*2)} y2={H-P - t*(H-P*2)} stroke="var(--border)" />
        </g>
      ))}
      <path d={area} fill="color-mix(in oklab, var(--foreground) 5%, transparent)" />
      <path d={path} stroke="var(--foreground)" strokeWidth="1.5" fill="none" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2" fill="var(--foreground)" />)}
      {xLabels.map((l, i) => (
        <text key={i} x={P + (i/(xLabels.length-1)) * (W - P*2)} y={H-8} fontSize="9" fill="var(--muted-foreground)" textAnchor="middle">{l}</text>
      ))}
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[0.1, 0.2, 0.3, 0.4, 0.5].map((d, i) => (
        <Card key={i} className="rounded-2xl shadow-sm p-5" style={{ animation: `fadeSlideUp 0.4s ease ${d}s both` }}>
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-36 mb-2" />
          <Skeleton className="h-3 w-48" />
        </Card>
      ))}
      <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

function DonutChart({ mpesa, emola }: { mpesa: number; emola: number }) {
  const total = Math.max(1, mpesa + emola);
  const r = 70, c = 2 * Math.PI * r;
  const mPct = mpesa / total, ePct = emola / total;
  return (
    <svg viewBox="0 0 180 180" className="w-44 h-44">
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--border)" strokeWidth="16" />
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--primary)" strokeWidth="16"
        strokeDasharray={`${c*mPct} ${c}`} transform="rotate(-90 90 90)" strokeLinecap="butt" />
      <circle cx="90" cy="90" r={r} fill="none" stroke="color-mix(in oklab, var(--foreground) 25%, transparent)" strokeWidth="16"
        strokeDasharray={`${c*ePct} ${c}`} strokeDashoffset={-c*mPct} transform="rotate(-90 90 90)" strokeLinecap="butt" />
      <text x="90" y="88" textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--foreground)">{mpesa+emola}</text>
      <text x="90" y="108" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">transações</text>
    </svg>
  );
}
