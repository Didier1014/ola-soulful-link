import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/SiteHeader";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel — Redox Pay" },
      { name: "description", content: "Painel de pagamentos Redox Pay: transações, payouts e métricas em tempo real." },
    ],
  }),
  component: DashboardPage,
});

/* ---------- mock data ---------- */
const kpis = [
  { label: "Saldo disponível", value: "MZN 482 350", delta: "+12,4%", up: true, hint: "vs. semana passada" },
  { label: "Volume hoje", value: "MZN 96 120", delta: "+3,1%", up: true, hint: "1 248 transações" },
  { label: "Taxa de sucesso", value: "99,4%", delta: "+0,2%", up: true, hint: "últimos 7 dias" },
  { label: "Tempo médio", value: "1,7s", delta: "-0,3s", up: true, hint: "confirmação" },
];

const transactions = [
  { id: "TXN-9821", customer: "Aida Macuácua", method: "M-Pesa",  amount: "MZN 1 250", status: "Confirmada", time: "há 2 min" },
  { id: "TXN-9820", customer: "João Sitoe",    method: "e-Mola",  amount: "MZN 480",   status: "Confirmada", time: "há 4 min" },
  { id: "TXN-9819", customer: "Loja Baia",     method: "Cartão",  amount: "MZN 12 900",status: "Pendente",   time: "há 6 min" },
  { id: "TXN-9818", customer: "Hélder Mondlane",method:"M-Pesa",  amount: "MZN 320",   status: "Confirmada", time: "há 9 min" },
  { id: "TXN-9817", customer: "Café Polana",   method: "e-Mola",  amount: "MZN 75",    status: "Falhou",     time: "há 12 min" },
  { id: "TXN-9816", customer: "Nilza Cumbe",   method: "M-Pesa",  amount: "MZN 2 400", status: "Confirmada", time: "há 15 min" },
  { id: "TXN-9815", customer: "Mercado 24",    method: "Cartão",  amount: "MZN 860",   status: "Confirmada", time: "há 18 min" },
];

const methods = [
  { name: "M-Pesa", pct: 62, color: "bg-brand-red" },
  { name: "e-Mola", pct: 27, color: "bg-brand-pink" },
  { name: "Cartão", pct: 11, color: "bg-white/70" },
];

const payouts = [
  { bank: "BCI ••4421", amount: "MZN 120 000", date: "16 Jun, 09:12", status: "Pago" },
  { bank: "Millennium ••8830", amount: "MZN 84 500", date: "15 Jun, 17:40", status: "Pago" },
  { bank: "Standard ••1102", amount: "MZN 56 000", date: "14 Jun, 11:05", status: "Em curso" },
];

// 14 dias de volume (mock)
const volume = [22, 38, 31, 45, 40, 55, 48, 62, 58, 70, 64, 78, 84, 96];

/* ---------- page ---------- */
function DashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <TopBar />
          <main className="px-6 py-8 lg:px-10 space-y-8">
            <Header />
            <KpiGrid />
            <div className="grid gap-6 lg:grid-cols-3">
              <VolumeChart />
              <MethodsCard />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <TransactionsCard />
              <SideStack />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/* ---------- pieces ---------- */
function Sidebar() {
  const items = [
    { label: "Visão geral", icon: "▦", active: true },
    { label: "Transações", icon: "⇋" },
    { label: "Payouts", icon: "↑" },
    { label: "Clientes", icon: "◔" },
    { label: "Produtos", icon: "▤" },
    { label: "Integrações", icon: "⛓" },
    { label: "Relatórios", icon: "📈" },
  ];
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/5 bg-background/60 backdrop-blur-xl min-h-screen sticky top-0">
      <div className="h-16 px-6 flex items-center border-b border-white/5">
        <Logo />
      </div>
      <nav className="p-3 space-y-1">
        {items.map((i) => (
          <button
            key={i.label}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              i.active
                ? "bg-white/5 text-foreground border border-white/10"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
            }`}
          >
            <span className="w-5 text-center opacity-70">{i.icon}</span>
            {i.label}
          </button>
        ))}
      </nav>
      <div className="mt-auto p-4">
        <div className="card-soft p-4">
          <p className="text-xs text-muted-foreground">Modo</p>
          <div className="mt-2 flex rounded-lg bg-white/5 p-1 text-xs">
            <button className="flex-1 rounded-md bg-primary px-2 py-1 text-primary-foreground">Teste</button>
            <button className="flex-1 rounded-md px-2 py-1 text-muted-foreground">Produção</button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <div className="sticky top-0 z-30 h-16 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="h-full flex items-center justify-between gap-4 px-6 lg:px-10">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative w-full">
            <input
              placeholder="Buscar transações, clientes, IDs…"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-brand-red/60"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">⌕</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground">
            Voltar ao site
          </Link>
          <button className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm hover:bg-white/[0.06]">
            + Novo pagamento
          </button>
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-red to-brand-pink grid place-items-center text-sm font-semibold">
            A
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Bem-vindo de volta</p>
        <h1 className="text-3xl font-semibold tracking-tight">Painel <span className="text-brand-gradient">Redox Pay</span></h1>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {["Hoje", "7 dias", "30 dias", "90 dias"].map((r, i) => (
          <button
            key={r}
            className={`rounded-lg px-3 py-1.5 border transition ${
              i === 1
                ? "border-brand-red/40 bg-brand-red/10 text-foreground"
                : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

function KpiGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <div key={k.label} className="card-soft p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</p>
          <p className="mt-2 text-2xl font-semibold">{k.value}</p>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className={`rounded-md px-2 py-0.5 ${k.up ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              {k.delta}
            </span>
            <span className="text-muted-foreground">{k.hint}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function VolumeChart() {
  const max = Math.max(...volume);
  const w = 600, h = 200, pad = 10;
  const step = (w - pad * 2) / (volume.length - 1);
  const pts = volume.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)] as const);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${path} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z`;
  return (
    <div className="card-soft p-5 lg:col-span-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Volume processado</p>
          <p className="text-2xl font-semibold mt-1">MZN 1,24M <span className="text-sm text-emerald-400 font-normal">+18,2%</span></p>
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-red" />Volume</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 w-full h-48">
        <defs>
          <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.58 0.24 25)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="oklch(0.58 0.24 25)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#g1)" />
        <path d={path} fill="none" stroke="oklch(0.58 0.24 25)" strokeWidth="2" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="oklch(0.82 0.13 15)" />
        ))}
      </svg>
      <div className="mt-2 grid grid-cols-7 text-[10px] text-muted-foreground">
        {["Qua","Qui","Sex","Sáb","Dom","Seg","Ter"].map((d) => <span key={d} className="text-center">{d}</span>)}
      </div>
    </div>
  );
}

function MethodsCard() {
  return (
    <div className="card-soft p-5">
      <p className="text-sm text-muted-foreground">Métodos de pagamento</p>
      <p className="text-2xl font-semibold mt-1">Mix da semana</p>
      <div className="mt-5 space-y-4">
        {methods.map((m) => (
          <div key={m.name}>
            <div className="flex items-center justify-between text-sm">
              <span>{m.name}</span>
              <span className="text-muted-foreground">{m.pct}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
              <div className={`h-full ${m.color}`} style={{ width: `${m.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-muted-foreground">
        Próxima liquidação automática: <span className="text-foreground">hoje, 18:00</span>
      </div>
    </div>
  );
}

function TransactionsCard() {
  const statusStyle = (s: string) =>
    s === "Confirmada" ? "bg-emerald-500/10 text-emerald-400"
    : s === "Pendente" ? "bg-amber-500/10 text-amber-400"
    : "bg-red-500/10 text-red-400";
  return (
    <div className="card-soft p-5 lg:col-span-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Transações recentes</p>
          <p className="text-lg font-semibold">Últimas 24h</p>
        </div>
        <button className="text-xs text-muted-foreground hover:text-foreground">Ver todas →</button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b border-white/5">
              <th className="text-left font-medium py-2">ID</th>
              <th className="text-left font-medium py-2">Cliente</th>
              <th className="text-left font-medium py-2">Método</th>
              <th className="text-right font-medium py-2">Valor</th>
              <th className="text-left font-medium py-2 pl-4">Estado</th>
              <th className="text-right font-medium py-2">Quando</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="py-3 font-mono text-xs text-muted-foreground">{t.id}</td>
                <td className="py-3">{t.customer}</td>
                <td className="py-3 text-muted-foreground">{t.method}</td>
                <td className="py-3 text-right font-medium">{t.amount}</td>
                <td className="py-3 pl-4">
                  <span className={`rounded-md px-2 py-0.5 text-xs ${statusStyle(t.status)}`}>{t.status}</span>
                </td>
                <td className="py-3 text-right text-muted-foreground text-xs">{t.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SideStack() {
  return (
    <div className="space-y-6">
      <div className="card-soft p-5">
        <p className="text-sm text-muted-foreground">Payouts</p>
        <p className="text-lg font-semibold">Próximas liquidações</p>
        <ul className="mt-4 space-y-3">
          {payouts.map((p) => (
            <li key={p.bank} className="flex items-center justify-between text-sm">
              <div>
                <p>{p.bank}</p>
                <p className="text-xs text-muted-foreground">{p.date}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{p.amount}</p>
                <p className={`text-xs ${p.status === "Pago" ? "text-emerald-400" : "text-amber-400"}`}>{p.status}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card-soft p-5">
        <p className="text-sm text-muted-foreground">Chave de API</p>
        <p className="text-lg font-semibold">Ambiente de teste</p>
        <div className="mt-4 rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs text-muted-foreground break-all">
          rdx_test_sk_4a91••••••••••••••••a02f
        </div>
        <div className="mt-3 flex gap-2">
          <button className="flex-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 px-3 py-2 text-xs">
            Copiar
          </button>
          <button className="flex-1 rounded-lg bg-primary text-primary-foreground btn-glow px-3 py-2 text-xs">
            Rotacionar
          </button>
        </div>
      </div>
    </div>
  );
}
