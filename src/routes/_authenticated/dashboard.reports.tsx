import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, listMyTransactions } from "@/lib/transactions.functions";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { CircleDollarSign, ShoppingBag, CheckCircle2, Tag, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/reports")({
  component: ReportsPage,
});

const fmt = (n: number) => new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(n);

const PERIODS = [
  { id: "today", label: "Hoje" },
  { id: "7", label: "7 dias" },
  { id: "30", label: "30 dias" },
  { id: "90", label: "90 dias" },
  { id: "12m", label: "12 meses" },
] as const;

function ReportsPage() {
  const fetchStats = useServerFn(getDashboardStats);
  const fetchTx = useServerFn(listMyTransactions);
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats() });
  const { data: txs = [] } = useQuery({ queryKey: ["tx"], queryFn: () => fetchTx() });
  const [period, setPeriod] = useState<string>("30");
  const [tab, setTab] = useState<"visao"|"receita">("visao");

  const paid = txs.filter(t => t.status === "paid");
  const totalVol = stats?.total_volume ?? 0;
  const liquid = stats?.balance ?? 0;
  const conv = stats?.conversion ?? 0;
  const ticket = paid.length ? Math.round(totalVol / paid.length) : 0;
  const mpesaCount = paid.filter(t => t.method === "mpesa").length;
  const emolaCount = paid.filter(t => t.method === "emola").length;
  const mpesaSum = paid.filter(t => t.method === "mpesa").reduce((s,t)=>s+Number(t.amount_mzn),0);
  const emolaSum = paid.filter(t => t.method === "emola").reduce((s,t)=>s+Number(t.amount_mzn),0);

  return (
    <div className="space-y-4">
      <div className="px-1 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Análise completa do desempenho da sua conta</p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-medium ${period===p.id ? "bg-foreground text-background" : "bg-card border border-border text-foreground/80"}`}>
            {p.label}
          </button>
        ))}
        <button className="shrink-0 ml-auto px-3 py-2 rounded-xl bg-card border border-border text-xs flex items-center gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export PDF
        </button>
      </div>

      <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
        <button onClick={() => setTab("visao")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab==='visao' ? 'bg-foreground text-background' : 'text-foreground/70'}`}>Visão geral</button>
        <button onClick={() => setTab("receita")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab==='receita' ? 'bg-foreground text-background' : 'text-foreground/70'}`}>Receita</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={CircleDollarSign} iconColor="text-emerald-600" iconBg="bg-emerald-50" label="Volume" value={`${fmt(totalVol)} MT`} delta="+12.4%" />
        <StatCard icon={ShoppingBag} iconColor="text-violet-600" iconBg="bg-violet-50" label="Receita líq." value={`${fmt(liquid)} MT`} delta="+8.7%" />
        <StatCard icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-50" label="Conversão" value={`${conv}%`} delta="+2.1%" />
        <StatCard icon={Tag} iconColor="text-violet-600" iconBg="bg-violet-50" label="Ticket médio" value={`${fmt(ticket)} MT`} delta="+3.8%" />
        <StatCard dotColor="#10b981" label="M-PESA" value={`${fmt(mpesaSum)}`} delta="+10.2%" />
        <StatCard dotColor="#f59e0b" label="E-MOLA" value={`${fmt(emolaSum)}`} delta="+5.6%" />
      </div>

      <Card className="rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Volume diário por canal</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500"/>M-Pesa</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"/>e-Mola</span>
          </div>
        </div>
        <MultiLineChart mpesa={buildDaily(paid, "mpesa", 14)} emola={buildDaily(paid, "emola", 14)} />
      </Card>

      <Card className="rounded-2xl shadow-sm p-5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Métodos de pagamento</h3>
        <div className="mt-3 flex justify-center">
          <DonutVolume mpesa={mpesaSum} emola={emolaSum} />
        </div>
        <div className="mt-5 space-y-3 text-sm">
          <div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#e11d48]"/>M-Pesa</span><span><b>{fmt(mpesaSum)}</b> <span className="text-muted-foreground text-xs">({pct(mpesaSum, mpesaSum+emolaSum)}%)</span></span></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#f59e0b]"/>e-Mola</span><span><b>{fmt(emolaSum)}</b> <span className="text-muted-foreground text-xs">({pct(emolaSum, mpesaSum+emolaSum)}%)</span></span></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-muted-foreground"/>Outros</span><span><b>0</b> <span className="text-muted-foreground text-xs">(0%)</span></span></div>
        </div>
      </Card>

      <Card className="rounded-2xl shadow-sm p-5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">Distribuição por canal</h3>
        <BarRow color="#e11d48" label="M-Pesa" value={mpesaCount} total={mpesaCount+emolaCount} />
        <BarRow color="#f59e0b" label="e-Mola" value={emolaCount} total={mpesaCount+emolaCount} />
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, dotColor, label, value, delta }: { icon?: React.ElementType; iconBg?: string; iconColor?: string; dotColor?: string; label: string; value: string; delta: string }) {
  return (
    <Card className="rounded-2xl shadow-sm p-4">
      <div className="flex items-center gap-2">
        {Icon ? <div className={`h-8 w-8 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center`}><Icon className="h-4 w-4"/></div> : <div className="h-8 w-8 rounded-full" style={{background: dotColor}} />}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="text-xs text-emerald-600 mt-1">↗ {delta}</p>
    </Card>
  );
}

function BarRow({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  const p = total ? (value/total)*100 : 0;
  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{background: color}} />{label}</span>
        <span><b>{value}</b> <span className="text-muted-foreground text-xs">{p.toFixed(1)}%</span></span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${p}%`, background: color }} />
      </div>
    </div>
  );
}

function pct(n: number, d: number) { return d ? Math.round((n / d) * 1000) / 10 : 0; }

function buildDaily(paid: { created_at: string; amount_mzn: number; method: string }[], method: string, days: number) {
  const out: number[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const v = paid.filter(p => p.method === method && new Date(p.created_at).toDateString() === d.toDateString()).reduce((s,p)=>s+Number(p.amount_mzn),0);
    out.push(v);
  }
  return out;
}

function MultiLineChart({ mpesa, emola }: { mpesa: number[]; emola: number[] }) {
  const W = 320, H = 160, P = 24;
  const max = Math.max(1, ...mpesa, ...emola);
  const step = (W - P*2) / Math.max(1, mpesa.length - 1);
  const path = (arr: number[]) => arr.map((v,i) => `${i===0?'M':'L'}${P+i*step},${H-P-(v/max)*(H-P*2)}`).join(' ');
  const area = (arr: number[], color: string) => `${path(arr)} L${P+(arr.length-1)*step},${H-P} L${P},${H-P} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
      {[0.25,0.5,0.75,1].map((t,i)=> <line key={i} x1={P} x2={W-P} y1={H-P-t*(H-P*2)} y2={H-P-t*(H-P*2)} stroke="#f1f5f9" />)}
      <path d={area(mpesa, "#10b981")} fill="rgba(16,185,129,0.08)" />
      <path d={path(mpesa)} stroke="#10b981" strokeWidth="1.5" fill="none" />
      <path d={path(emola)} stroke="#f59e0b" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function DonutVolume({ mpesa, emola }: { mpesa: number; emola: number }) {
  const total = Math.max(1, mpesa + emola);
  const r = 70, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 180 180" className="w-44 h-44">
      <circle cx="90" cy="90" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
      <circle cx="90" cy="90" r={r} fill="none" stroke="#e11d48" strokeWidth="16" strokeDasharray={`${c*(mpesa/total)} ${c}`} transform="rotate(-90 90 90)" />
      <circle cx="90" cy="90" r={r} fill="none" stroke="#f59e0b" strokeWidth="16" strokeDasharray={`${c*(emola/total)} ${c}`} strokeDashoffset={-c*(mpesa/total)} transform="rotate(-90 90 90)" />
      <text x="90" y="86" textAnchor="middle" fontSize="20" fontWeight="600" fill="#0f172a">{new Intl.NumberFormat('pt-MZ').format(mpesa+emola)}</text>
      <text x="90" y="106" textAnchor="middle" fontSize="10" fill="#94a3b8">VOLUME</text>
    </svg>
  );
}
