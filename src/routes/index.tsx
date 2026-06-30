import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Zap, Smartphone, Code2, Repeat, QrCode, Link2, BarChart3,
  Lock, Fingerprint, KeyRound, CheckCircle2, Star, ArrowRight, MessageCircle,
  Cpu, TrendingUp, Globe, CreditCard, Sparkles, ChevronDown, Search, Bell,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Redox Pay — Receba pagamentos online em Moçambique" },
      { name: "description", content: "Receba pagamentos via M-Pesa e e-Mola em segundos. Checkout, links, QR Code e API para o seu negócio em Moçambique." },
      { property: "og:title", content: "Redox Pay — Pagamentos online em Moçambique" },
      { property: "og:description", content: "M-Pesa, e-Mola, checkout, links, QR Code e API. Liquidação em tempo real." },
    ],
  }),
  component: Landing,
});

const WHATSAPP = "https://wa.me/258840000000";

function Landing() {
  return (
    <div className="min-h-screen text-foreground overflow-x-hidden">

      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 left-1/4 h-[520px] w-[520px] rounded-full bg-primary/25 blur-[160px]" />
        <div className="absolute top-1/2 -right-32 h-[420px] w-[420px] rounded-full bg-primary-glow/20 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="relative z-10 bg-background min-h-screen">
        <Nav />
        <Hero />
        <PaymentFlow />
        <Features />
        <Security />
        <DashboardPreview />
        <Testimonials />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  );
}

/* ---------------- NAV ---------------- */
function Nav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-18 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-[0_0_18px_var(--primary-glow)]">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
          REDOX <span className="text-gradient-red">PAY</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#features" className="flex items-center gap-1 hover:text-foreground transition">Produtos <ChevronDown className="h-3.5 w-3.5" /></a>
          <a href="#security" className="flex items-center gap-1 hover:text-foreground transition">Soluções <ChevronDown className="h-3.5 w-3.5" /></a>
          <a href="#dashboard" className="flex items-center gap-1 hover:text-foreground transition">Recursos <ChevronDown className="h-3.5 w-3.5" /></a>
          <a href="#contact" className="hover:text-foreground transition">Preços</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="hidden sm:block"><Button variant="ghost" className="text-foreground hover:bg-white/5">Entrar</Button></Link>
          <Link to="/auth">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground red-glow rounded-full h-11 px-5">
              Acessar Plataforma <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  return (
    <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-28">
      {/* corner grid accents (AbacatePay-style) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]">
        <div className="absolute top-0 left-0 h-40 w-40 [background-image:repeating-linear-gradient(45deg,white_0,white_1px,transparent_1px,transparent_10px)]" />
        <div className="absolute top-0 right-0 h-40 w-40 [background-image:repeating-linear-gradient(-45deg,white_0,white_1px,transparent_1px,transparent_10px)]" />
      </div>

      <div className="relative grid lg:grid-cols-2 gap-12 items-center">
        {/* LEFT */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-muted-foreground mb-8">
            <span className="h-2 w-2 rounded-full bg-primary"></span>
            <span className="text-foreground font-medium">Operando em Moçambique:</span> M-Pesa e e-Mola.
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
            Sua escala é a <span className="text-gradient-red">nossa prioridade.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-md">
            Pagamentos online sem complicações.<br />
            Link de pagamentos, Checkout ou API simples para M-Pesa e e-Mola.
          </p>

          <div className="mt-10 flex items-center gap-5">
            <Link to="/auth">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground red-glow rounded-full h-13 px-7 text-base">
                Começar agora <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#features" className="text-sm font-medium text-foreground/80 hover:text-foreground transition underline-offset-4 hover:underline">
              Nosso manifesto
            </a>
          </div>

          {/* mini features */}
          <div className="mt-14 grid grid-cols-2 gap-6 max-w-md">
            <MiniFeature icon={Zap} title="Rápido" desc="Integre em minutos, não dias." />
            <MiniFeature icon={Lock} title="Seguro" desc="Criptografia de ponta." />
          </div>
        </div>

        {/* RIGHT — floating dashboard mock */}
        <div className="relative h-[560px] hidden lg:block">
          <div className="absolute -inset-10 bg-gradient-to-tr from-primary/30 via-primary-glow/20 to-transparent rounded-[3rem] blur-3xl" />
          {/* desktop card */}
          <div className="absolute top-8 right-0 w-[440px] rounded-2xl border border-white/10 bg-card/90 backdrop-blur-xl shadow-2xl shadow-primary/20 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 text-xs text-muted-foreground">
              <Search className="h-3.5 w-3.5" /> <span className="flex-1">Pesquisar</span>
              <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px]">⌘F</span>
              <Bell className="h-3.5 w-3.5 ml-2" />
            </div>
            <div className="p-5">
              <p className="text-xs text-muted-foreground">Total em vendas</p>
              <p className="text-3xl font-bold mt-1">MZN 482.110</p>
              <div className="flex gap-1 mt-4">
                {["Hoje","Ontem","Semana","Mês"].map((t,i)=>(
                  <span key={t} className={`text-[11px] px-2.5 py-1 rounded-md ${i===0?"bg-primary/20 text-primary-glow":"text-muted-foreground"}`}>{t}</span>
                ))}
              </div>
              {/* fake chart */}
              <svg viewBox="0 0 400 130" className="mt-4 w-full h-32">
                <defs>
                  <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.58 0.22 25)" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="oklch(0.58 0.22 25)" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,100 C40,90 60,60 100,70 C140,80 160,40 200,35 C240,30 270,55 310,45 C350,35 380,25 400,30 L400,130 L0,130 Z" fill="url(#g1)"/>
                <path d="M0,100 C40,90 60,60 100,70 C140,80 160,40 200,35 C240,30 270,55 310,45 C350,35 380,25 400,30" stroke="oklch(0.62 0.22 18)" strokeWidth="2.5" fill="none"/>
              </svg>
              <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                <MockMini label="Pedidos" v="652" delta="+12" up />
                <MockMini label="Pagos" v="231" delta="-04" />
                <MockMini label="Pendentes" v="245" delta="+8" up />
              </div>
            </div>
          </div>
          {/* phone card overlapping */}
          <div className="absolute bottom-0 left-0 w-[230px] rounded-[2rem] border border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl shadow-primary/30 p-4 rotate-[-4deg]">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-2"><span>9:41</span><span>●●●</span></div>
            <p className="text-[10px] text-muted-foreground">Total em vendas</p>
            <p className="text-xl font-bold">MZN 8.283</p>
            <div className="mt-3 h-16 rounded-lg bg-gradient-to-tr from-primary/30 to-primary-glow/10 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-primary/20 to-transparent" />
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Pedidos</span><span className="font-semibold">652</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Pagos</span><span className="font-semibold">231</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="relative mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        <Stat value="1.6M+" label="Transações" />
        <Stat value="800k+" label="Movimentados/dia" />
        <Stat value="<24h" label="Saque disponível" />
        <Stat value="99.4%" label="Taxa de sucesso" />
      </div>
    </section>
  );
}

function MiniFeature({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary-glow" />
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function MockMini({ label, v, delta, up }: { label: string; v: string; delta: string; up?: boolean }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold mt-0.5">{v}</p>
      <p className={`text-[9px] ${up?"text-emerald-400":"text-rose-400"}`}>{delta}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur">
      <div className="text-3xl md:text-4xl font-bold text-gradient-red">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

/* ---------------- PAYMENT FLOW ---------------- */
function PaymentFlow() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <p className="text-sm uppercase tracking-widest text-primary-glow mb-3">Checkout em 2 segundos</p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Pague do seu jeito, em segundos</h2>
        <p className="mt-4 text-muted-foreground">Experiência de pagamento nativa para M-Pesa e e-Mola.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <StepCard n={1} title="Escolha o método" desc="Cliente seleciona M-Pesa ou e-Mola no checkout." icon={Smartphone} />
        <StepCard n={2} title="Insere o número" desc="Confirma no telemóvel com PIN da carteira." icon={KeyRound} />
        <StepCard n={3} title="Confirmado" desc="Pagamento processado em menos de 2 segundos." icon={CheckCircle2} highlight />
      </div>

      <div className="mt-12 flex items-center justify-center gap-6">
        <MethodPill name="M-Pesa" color="#e11d48" letter="M" />
        <MethodPill name="e-Mola" color="#f59e0b" letter="e" />
      </div>
    </section>
  );
}

function StepCard({ n, title, desc, icon: Icon, highlight }: { n: number; title: string; desc: string; icon: React.ElementType; highlight?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl p-7 border ${highlight ? "border-primary/40 bg-gradient-to-br from-primary/15 to-transparent" : "border-white/5 bg-white/[0.02]"}`}>
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Passo {n}</span>
        <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary-glow" />
        </div>
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function MethodPill({ name, color, letter }: { name: string; color: string; letter: string }) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2.5">
      <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold" style={{ background: color }}>{letter}</div>
      <span className="font-medium">{name}</span>
    </div>
  );
}

/* ---------------- FEATURES ---------------- */
function Features() {
  const items = [
    { icon: Smartphone, title: "M-Pesa & e-Mola", desc: "Receba diretamente nas carteiras móveis em segundos." },
    { icon: Zap, title: "Checkout rápido", desc: "Páginas otimizadas para máxima conversão." },
    { icon: Code2, title: "API & SDKs", desc: "API REST moderna, webhooks e SDKs prontos." },
    { icon: Repeat, title: "Recorrência", desc: "Cobranças automáticas e planos de assinatura." },
    { icon: QrCode, title: "QR Code", desc: "Gere QR dinâmicos para receber em qualquer lugar." },
    { icon: Link2, title: "Links de pagamento", desc: "Partilhe via WhatsApp, SMS ou email." },
    { icon: TrendingUp, title: "Saque <24h", desc: "Levante o seu dinheiro em menos de 24 horas, todos os dias." },
    { icon: BarChart3, title: "Relatórios", desc: "Dashboards completos e exportações." },
  ];
  return (
    <section id="features" className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <p className="text-sm uppercase tracking-widest text-primary-glow mb-3">Funcionalidades</p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Tudo o que precisa para receber</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map((it) => (
          <div key={it.title} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-primary/30 hover:bg-white/[0.04] transition">
            <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <it.icon className="h-5 w-5 text-primary-glow" />
            </div>
            <h3 className="font-semibold">{it.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{it.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- SECURITY ---------------- */
function Security() {
  const items = [
    { icon: Lock, title: "Criptografia AES-256 e TLS 1.3", desc: "Dados protegidos em trânsito e em repouso." },
    { icon: ShieldCheck, title: "Antifraude em tempo real", desc: "Análise de risco em cada transação." },
    { icon: Cpu, title: "Infra PCI-DSS", desc: "Padrão internacional de pagamentos." },
    { icon: Fingerprint, title: "2FA e biometria", desc: "Autenticação reforçada e tokens rotativos." },
  ];
  return (
    <section id="security" className="max-w-7xl mx-auto px-6 py-24">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-card via-card to-primary/10 p-10 md:p-16">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/20 blur-[120px]" />
        <div className="relative grid md:grid-cols-2 gap-10">
          <div>
            <p className="text-sm uppercase tracking-widest text-primary-glow mb-3">Segurança</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Confiança em cada transação</h2>
            <p className="mt-4 text-muted-foreground">Construído com os mais altos padrões de segurança bancária para proteger o seu negócio e os seus clientes.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["PCI-DSS", "ISO 27001", "SOC 2", "GDPR"].map(b => (
                <span key={b} className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium">{b}</span>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {items.map(it => (
              <div key={it.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <it.icon className="h-5 w-5 text-primary-glow mb-3" />
                <p className="font-semibold text-sm">{it.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{it.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- DASHBOARD PREVIEW ---------------- */
function DashboardPreview() {
  return (
    <section id="dashboard" className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-sm uppercase tracking-widest text-primary-glow mb-3">Painel inteligente</p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Gestão completa do seu negócio</h2>
        <p className="mt-4 text-muted-foreground">Vendas em tempo real, relatórios, estornos e antecipação de recebíveis. Taxa única e transparente: <span className="text-foreground font-semibold">15% + 15 MT</span> por transação aprovada — sem mensalidade, sem setup.</p>
      </div>

      <div className="relative rounded-3xl border border-white/10 bg-card/40 p-6 md:p-10 backdrop-blur">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-[60%] rounded-full bg-primary/20 blur-[100px]" />
        <div className="relative grid md:grid-cols-3 gap-4">
          <MockKpi label="Saldo disponível" value="MZN 1.284.530" delta="+12.4%" />
          <MockKpi label="Receita do mês" value="MZN 482.110" delta="+28.9%" />
          <MockKpi label="Taxa de sucesso" value="99.4%" delta="+0.2%" />
        </div>
        <div className="relative mt-6 rounded-2xl border border-white/10 bg-background/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Transações recentes</h4>
            <span className="text-xs text-emerald-400 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Crescendo</span>
          </div>
          <div className="space-y-2 text-sm">
            <MockTx name="Aisha M." method="M-Pesa" color="#e11d48" amount="MZN 4.500" />
            <MockTx name="Bruno Sitoe" method="e-Mola" color="#f59e0b" amount="MZN 1.200" />
            <MockTx name="Carla Macuácua" method="M-Pesa" color="#e11d48" amount="MZN 8.750" />
            <MockTx name="Délcio Nhaca" method="e-Mola" color="#f59e0b" amount="MZN 2.450" />
          </div>
        </div>
      </div>
    </section>
  );
}

function MockKpi({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/40 p-5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-emerald-400">{delta}</p>
    </div>
  );
}
function MockTx({ name, method, color, amount }: { name: string; method: string; color: string; amount: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 last:border-0 py-2">
      <div className="flex items-center gap-3">
        <span className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: color }}>{method[0]}</span>
        <span>{name}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{method}</span>
        <span className="font-semibold">{amount}</span>
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      </div>
    </div>
  );
}

/* ---------------- TESTIMONIALS ---------------- */
function Testimonials() {
  const items = [
    { name: "Hélder Mucavele", role: "CEO, Loja Online MZ", text: "Em 1 semana migrámos todo o checkout. Conversão subiu 34%." },
    { name: "Lúcia Tembe", role: "Fundadora, Beleza Maputo", text: "O suporte é fantástico e a liquidação chega no mesmo dia." },
    { name: "Edson Mahumane", role: "CTO, EduTech", text: "API limpa, webhooks confiáveis. Integração feita em horas." },
    { name: "Sara Cossa", role: "Diretora, Boutique Sol", text: "Os meus clientes adoram pagar com M-Pesa em 2 segundos." },
  ];
  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <p className="text-sm uppercase tracking-widest text-primary-glow mb-3">Depoimentos</p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Negócios que confiam na Redox</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map(t => (
          <div key={t.name} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-sm text-foreground/85">"{t.text}"</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-xs font-bold">
                {t.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </div>
              <div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-[11px] text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- FINAL CTA ---------------- */
function FinalCTA() {
  return (
    <section id="contact" className="max-w-7xl mx-auto px-6 py-24">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-primary/30 bg-gradient-to-br from-primary/20 via-card to-card p-12 md:p-20 text-center">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-[60%] rounded-full bg-primary/25 blur-[140px]" />
        <div className="relative">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Comece a receber em minutos</h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">Sem mensalidades, sem instalação. Crie a sua conta e aceite o primeiro pagamento hoje.</p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground red-glow h-12 px-8 text-base">
                Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href={WHATSAPP} target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline" className="border-white/15 bg-white/5 hover:bg-white/10 h-12 px-8 text-base">
                <MessageCircle className="mr-2 h-4 w-4" /> Suporte WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FOOTER ---------------- */
function Footer() {
  const groups = [
    { title: "Produto", links: ["Funcionalidades", "Checkout", "Links", "QR Code", "Preços"] },
    { title: "Desenvolvedores", links: ["Documentação", "API REST", "SDKs", "Webhooks", "Status"] },
    { title: "Empresa", links: ["Sobre", "Carreiras", "Imprensa", "Parceiros", "Blog"] },
    { title: "Suporte", links: ["Centro de ajuda", "Contacto WhatsApp", "Comunidade", "Termos", "Privacidade"] },
  ];
  return (
    <footer className="border-t border-white/5 bg-background/60 backdrop-blur mt-12">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="h-2.5 w-2.5 rounded-full bg-primary-glow shadow-[0_0_14px_var(--primary-glow)]" />
              REDOX <span className="text-gradient-red">PAY</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">A forma mais rápida de receber pagamentos online em Moçambique.</p>
            <p className="mt-4 text-xs text-muted-foreground flex items-center gap-2"><Globe className="h-3 w-3" /> contacto@redoxpay.mz</p>
          </div>
          {groups.map(g => (
            <div key={g.title}>
              <p className="text-sm font-semibold mb-4">{g.title}</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {g.links.map(l => <li key={l}><a href="#" className="hover:text-foreground transition">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-3">
          <p>© {new Date().getFullYear()} Redox Pay · Maputo, Moçambique</p>
          <div className="flex items-center gap-2">
            <CreditCard className="h-3 w-3" /> PCI-DSS · ISO 27001 · SOC 2
          </div>
        </div>
      </div>
    </footer>
  );
}
