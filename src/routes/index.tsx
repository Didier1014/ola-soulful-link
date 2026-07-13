import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Zap, Smartphone, Code2, Repeat, QrCode, Link2, BarChart3,
  Lock, Fingerprint, KeyRound, CheckCircle2, Star, ArrowRight, MessageCircle,
  Cpu, TrendingUp, Globe, CreditCard, ChevronDown, Search, Bell,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useReveal } from "@/hooks/use-reveal";
import ParallaxGlow from "@/components/parallax-glow";
import { MagneticButton } from "@/components/magnetic-button";
import { CountUp } from "@/components/count-up";
import { SeoKeywordsButton } from "@/components/seo-keywords-button";

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

const SUPPORT_PHONE = "858181922";
const WHATSAPP = `https://wa.me/258${SUPPORT_PHONE}`;

function onCardGlow(e: React.MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
}

function Landing() {
  return (
    <div className="min-h-screen text-foreground overflow-x-hidden noise">
      <ScrollProgress />

      <div className="relative z-10 min-h-screen">
        <Nav />
        <HudTicker />
        <Hero />
        <PaymentFlow />
        <Features />
        <Security />
        <DashboardPreview />
        <Testimonials />
        <FinalCTA />
        <Footer />
      </div>
      <SeoKeywordsButton />
    </div>
  );
}

function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollHeight - h.clientHeight;
      setProgress(scrolled > 0 ? (h.scrollTop / scrolled) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-primary to-primary-glow transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function HudTicker() {
  const items = [
    ["NODE_MZ_01", "ONLINE", "success"],
    ["LATENCY", "142ms", "muted"],
    ["UPTIME", "99.98%", "muted"],
    ["M-PESA", "OK", "success"],
    ["E-MOLA", "OK", "success"],
    ["ENCRYPT", "AES-256", "muted"],
    ["PCI-DSS", "L1", "muted"],
    ["v4.0.2", "STABLE", "muted"],
  ] as const;
  return (
    <div className="border-b border-white/5 bg-black/40 backdrop-blur-sm overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 h-7 flex items-center gap-6 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground overflow-x-auto scrollbar-none">
        {items.map(([k, v, tone]) => (
          <span key={k} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-foreground/50">[{k}]</span>
            <span className={tone === "success" ? "text-emerald-400" : "text-primary-glow"}>{v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`liquid-glass sticky top-0 z-50 backdrop-blur-xl transition-all duration-300 ${
        scrolled ? "" : ""
      }`}
    >
      <div
        className={`max-w-7xl mx-auto px-6 flex items-center justify-between transition-all duration-300 ${
          scrolled ? "h-14" : "h-18 py-3"
        }`}
      >
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
            <MagneticButton className="bg-primary hover:bg-primary/90 text-primary-foreground red-glow rounded-full h-11 px-5">
              Acessar Plataforma <ArrowRight className="ml-1 h-4 w-4" />
            </MagneticButton>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { ref, visible } = useReveal<HTMLElement>();
  return (
    <section
      ref={ref}
      className={`relative max-w-7xl mx-auto px-6 pt-16 pb-28 transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <ParallaxGlow />

      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] z-10">
        <div className="absolute top-0 left-0 h-40 w-40 [background-image:repeating-linear-gradient(45deg,white_0,white_1px,transparent_1px,transparent_10px)]" />
        <div className="absolute top-0 right-0 h-40 w-40 [background-image:repeating-linear-gradient(-45deg,white_0,white_1px,transparent_1px,transparent_10px)]" />
      </div>

      <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="liquid-glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted-foreground mb-8">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-glow shadow-[0_0_8px_var(--primary-glow)]" />
            </span>
            <span className="text-primary-glow font-mono uppercase tracking-[0.18em] text-[10px]">Operando em Moçambique</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-foreground">M-Pesa · e-Mola</span>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-muted-foreground mb-3">/ 001 · Manifesto</p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
            <span className="font-light text-foreground/70">Sua escala é a</span>{" "}
            <span className="text-gradient-red">nossa prioridade.</span>
          </h1>
          <p className="mt-6 text-lg font-light text-muted-foreground max-w-md">
            Pagamentos online sem complicações.<br />
            Link de pagamentos, Checkout ou API simples para M-Pesa e e-Mola.
          </p>

          <div className="mt-10 flex items-center gap-5">
            <Link to="/auth">
              <MagneticButton size="lg" className="liquid-glass-strong text-foreground rounded-full h-13 px-7 text-base transition-transform hover:scale-105 active:scale-95">
                Começar agora <ArrowRight className="ml-2 h-4 w-4" />
              </MagneticButton>
            </Link>
            <a href="#features" className="text-sm font-medium text-foreground/80 hover:text-foreground transition underline-offset-4 hover:underline">
              Nosso manifesto
            </a>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-6 max-w-md">
            <MiniFeature icon={Zap} title="Rápido" desc="Integre em minutos, não dias." />
            <MiniFeature icon={Lock} title="Seguro" desc="Criptografia de ponta." />
          </div>
        </div>

        <div className="relative h-[560px] hidden lg:block">
          <div className="absolute -inset-10 bg-gradient-to-tr from-primary/30 via-primary-glow/20 to-transparent rounded-[3rem] blur-3xl" />
          <div className="liquid-glass-strong absolute top-8 right-0 w-[440px] rounded-2xl shadow-2xl shadow-primary/30 overflow-hidden neo-scan neo-corner animate-float">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 text-xs text-muted-foreground">
              <Search className="h-3.5 w-3.5" /> <span className="flex-1">Pesquisar</span>
              <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px]">⌘F</span>
              <Bell className="h-3.5 w-3.5 ml-2" />
            </div>
            <div className="p-5">
              <p className="text-xs text-muted-foreground">Total em vendas</p>
              <p className="text-3xl font-bold mt-1">MZN 482.110</p>
              <div className="flex gap-1 mt-4">
                {["Hoje", "Ontem", "Semana", "Mês"].map((t, i) => (
                  <span key={t} className={`text-[11px] px-2.5 py-1 rounded-md ${i === 0 ? "bg-primary/20 text-primary-glow" : "text-muted-foreground"}`}>{t}</span>
                ))}
              </div>
              <svg viewBox="0 0 400 130" className="mt-4 w-full h-32">
                <defs>
                  <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.58 0.22 25)" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="oklch(0.58 0.22 25)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,100 C40,90 60,60 100,70 C140,80 160,40 200,35 C240,30 270,55 310,45 C350,35 380,25 400,30 L400,130 L0,130 Z" fill="url(#g1)" />
                <path d="M0,100 C40,90 60,60 100,70 C140,80 160,40 200,35 C240,30 270,55 310,45 C350,35 380,25 400,30" stroke="oklch(0.62 0.22 18)" strokeWidth="2.5" fill="none" />
              </svg>
              <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                <MockMini label="Pedidos" v="652" delta="+12" up />
                <MockMini label="Pagos" v="231" delta="-04" />
                <MockMini label="Pendentes" v="245" delta="+8" up />
              </div>
            </div>
          </div>
          <div className="liquid-glass absolute bottom-0 left-0 w-[230px] rounded-[2rem] shadow-2xl shadow-primary/30 p-4 rotate-[-4deg] animate-float-delayed">
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

      <div className="relative mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        <Stat value="1.6M+" target={1.6} decimals={1} suffix="M+" label="Transações" />
        <Stat value="800k+" target={800} decimals={0} suffix="k+" label="Movimentados/dia" />
        <Stat value="<24h" label="Saque disponível" />
        <Stat value="99.4%" target={99.4} decimals={1} suffix="%" label="Taxa de sucesso" />
      </div>
    </section>
  );
}

function MiniFeature({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="liquid-glass flex gap-3 rounded-2xl p-4">
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
    <div className="liquid-glass rounded-lg p-2">
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold mt-0.5">{v}</p>
      <p className={`text-[9px] ${up ? "text-emerald-400" : "text-rose-400"}`}>{delta}</p>
    </div>
  );
}

function Stat({
  value, label, target, decimals = 0, suffix = "",
}: { value: string; label: string; target?: number; decimals?: number; suffix?: string }) {
  return (
    <div
      onMouseMove={onCardGlow}
      className="card-glow relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur neo-corner overflow-hidden group hover:border-primary/30 transition"
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-glow/60 to-transparent" />
      <div className="text-3xl md:text-4xl font-bold text-gradient-red font-mono tracking-tight">
        {target !== undefined ? <CountUp target={target} decimals={decimals} suffix={suffix} /> : value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="mt-3 h-[2px] w-full bg-white/5 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-primary-glow w-3/4 group-hover:w-full transition-all duration-700" />
      </div>
    </div>
  );
}

function PaymentFlow() {
  const { ref, visible } = useReveal<HTMLElement>();
  return (
    <section
      ref={ref}
      className={`max-w-7xl mx-auto px-6 py-24 transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="text-center max-w-2xl mx-auto mb-16">
        <p className="text-sm uppercase tracking-widest text-primary-glow mb-3">Checkout em 2 segundos</p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Pague do seu jeito, em segundos</h2>
        <p className="mt-4 font-light text-muted-foreground">Experiência de pagamento nativa para M-Pesa e e-Mola.</p>
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
    <div
      onMouseMove={onCardGlow}
      className={`card-glow group relative overflow-hidden rounded-3xl p-7 border transition ${highlight ? "border-primary/40 bg-gradient-to-br from-primary/15 to-transparent neo-scan" : "border-white/10 bg-white/[0.02] hover:border-primary/30"}`}
    >
      <span aria-hidden className="absolute top-3 left-3 h-3.5 w-3.5 border-t border-l border-primary-glow/70" />
      <span aria-hidden className="absolute bottom-3 right-3 h-3.5 w-3.5 border-b border-r border-primary-glow/70" />
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
      <span aria-hidden className="absolute -top-2 right-4 text-[80px] leading-none font-mono font-black text-white/[0.04] group-hover:text-primary/10 transition-colors select-none">
        {String(n).padStart(2, "0")}
      </span>
      <div className="relative flex items-center justify-between mb-5">
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono">// Passo {String(n).padStart(2, "0")}</span>
        <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shadow-[0_0_18px_-6px_var(--primary-glow)]">
          <Icon className="h-5 w-5 text-primary-glow" />
        </div>
      </div>
      <h3 className="relative text-xl font-semibold">{title}</h3>
      <p className="relative mt-2 text-sm font-light text-muted-foreground">{desc}</p>
      <div className="relative mt-5 h-px w-full bg-gradient-to-r from-primary/50 via-primary/10 to-transparent" />
    </div>
  );
}

function MethodPill({ name, color, letter }: { name: string; color: string; letter: string }) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 backdrop-blur hover:border-primary/30 transition">
      <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold shadow-[0_0_16px_-4px_currentColor]" style={{ background: color, color }}>
        <span className="text-white">{letter}</span>
      </div>
      <span className="font-medium">{name}</span>
      <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_currentColor]" /> LIVE
      </span>
    </div>
  );
}

function Features() {
  const { ref, visible } = useReveal<HTMLElement>();
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
    <section
      id="features"
      ref={ref}
      className={`max-w-7xl mx-auto px-6 py-24 transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="inline-flex items-center gap-3 mb-4">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary-glow" />
          <p className="text-[10px] uppercase tracking-[0.32em] text-primary-glow font-mono">// Módulos</p>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary-glow" />
        </div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Tudo o que precisa para receber</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map((it, i) => (
          <div
            key={it.title}
            onMouseMove={onCardGlow}
            className="card-glow group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-primary/30 hover:bg-white/[0.04] transition"
            style={{ transitionDelay: visible ? `${i * 40}ms` : "0ms" }}
          >
            <span aria-hidden className="absolute top-2 left-2 h-3 w-3 border-t border-l border-white/10 group-hover:border-primary-glow/60 transition-colors" />
            <span aria-hidden className="absolute bottom-2 right-2 h-3 w-3 border-b border-r border-white/10 group-hover:border-primary-glow/60 transition-colors" />
            <div className="flex items-center justify-between mb-4">
              <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shadow-[0_0_16px_-6px_var(--primary-glow)]">
                <it.icon className="h-5 w-5 text-primary-glow" />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest">M.{String(i + 1).padStart(2, "0")}</span>
            </div>
            <h3 className="font-semibold">{it.title}</h3>
            <p className="mt-1.5 text-sm font-light text-muted-foreground">{it.desc}</p>
            <div aria-hidden className="mt-4 h-px w-0 bg-gradient-to-r from-primary to-primary-glow group-hover:w-full transition-all duration-500" />
          </div>
        ))}
      </div>
    </section>
  );
}

function Security() {
  const { ref, visible } = useReveal<HTMLElement>();
  const items = [
    { icon: Lock, title: "Criptografia AES-256 e TLS 1.3", desc: "Dados protegidos em trânsito e em repouso." },
    { icon: ShieldCheck, title: "Antifraude em tempo real", desc: "Análise de risco em cada transação." },
    { icon: Cpu, title: "Infra PCI-DSS", desc: "Padrão internacional de pagamentos." },
    { icon: Fingerprint, title: "2FA e biometria", desc: "Autenticação reforçada e tokens rotativos." },
  ];
  return (
    <section
      id="security"
      ref={ref}
      className={`max-w-7xl mx-auto px-6 py-24 transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-card via-card to-primary/10 p-10 md:p-16">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/20 blur-[120px]" />
        <div className="relative grid md:grid-cols-2 gap-10">
          <div>
            <p className="text-sm uppercase tracking-widest text-primary-glow mb-3">Segurança</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Confiança em cada transação</h2>
            <p className="mt-4 font-light text-muted-foreground">Construído com os mais altos padrões de segurança bancária para proteger o seu negócio e os seus clientes.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["PCI-DSS", "ISO 27001", "SOC 2", "GDPR"].map(b => (
                <span key={b} className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium">{b}</span>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {items.map(it => (
              <div key={it.title} onMouseMove={onCardGlow} className="card-glow rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <it.icon className="h-5 w-5 text-primary-glow mb-3" />
                <p className="font-semibold text-sm">{it.title}</p>
                <p className="mt-1 text-xs font-light text-muted-foreground">{it.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  const { ref, visible } = useReveal<HTMLElement>();
  return (
    <section
      id="dashboard"
      ref={ref}
      className={`max-w-7xl mx-auto px-6 py-24 transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-sm uppercase tracking-widest text-primary-glow mb-3">Painel inteligente</p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Gestão completa do seu negócio</h2>
        <p className="mt-4 font-light text-muted-foreground">Vendas em tempo real, relatórios, estornos e antecipação de recebíveis. Taxa única e transparente: <span className="text-foreground font-semibold">15% + 15 MT</span> por transação aprovada — sem mensalidade, sem setup.</p>
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
    <div className="liquid-glass-strong relative rounded-2xl p-5 overflow-hidden">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-glow to-transparent" />
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono">// {label}</p>
      <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-neo-glow">{value}</p>
      <p className="mt-1 text-xs text-emerald-400 font-mono">▲ {delta}</p>
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

function Testimonials() {
  const { ref, visible } = useReveal<HTMLElement>();
  const items = [
    { name: "Hélder Mucavele", role: "CEO, Loja Online MZ", text: "Em 1 semana migrámos todo o checkout. Conversão subiu 34%." },
    { name: "Lúcia Tembe", role: "Fundadora, Beleza Maputo", text: "O suporte é fantástico e a liquidação chega no mesmo dia." },
    { name: "Edson Mahumane", role: "CTO, EduTech", text: "API limpa, webhooks confiáveis. Integração feita em horas." },
    { name: "Sara Cossa", role: "Diretora, Boutique Sol", text: "Os meus clientes adoram pagar com M-Pesa em 2 segundos." },
  ];
  return (
    <section
      ref={ref}
      className={`max-w-7xl mx-auto px-6 py-24 transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="text-center max-w-2xl mx-auto mb-16">
        <p className="text-sm uppercase tracking-widest text-primary-glow mb-3">Depoimentos</p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Negócios que confiam na Redox</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map((t, i) => (
          <div
            key={t.name}
            onMouseMove={onCardGlow}
            className="card-glow rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-500 hover:border-primary/25"
            style={{ transitionDelay: visible ? `${i * 60}ms` : "0ms" }}
          >
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-sm font-light text-foreground/85">"{t.text}"</p>
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

function FinalCTA() {
  const { ref, visible } = useReveal<HTMLElement>();
  return (
    <section
      id="contact"
      ref={ref}
      className={`max-w-7xl mx-auto px-6 py-24 transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="relative overflow-hidden rounded-[2.5rem] border border-primary/30 bg-gradient-to-br from-primary/20 via-card to-card p-12 md:p-20 text-center">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-[60%] rounded-full bg-primary/25 blur-[140px]" />
        <div className="relative">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Comece a receber em minutos</h2>
          <p className="mt-5 text-lg font-light text-muted-foreground max-w-xl mx-auto">Sem mensalidades, sem instalação. Crie a sua conta e aceite o primeiro pagamento hoje.</p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/auth">
              <MagneticButton size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground red-glow h-12 px-8 text-base">
                Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" />
              </MagneticButton>
            </Link>
            <a href={WHATSAPP} target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline" className="border-white/15 bg-white/5 hover:bg-white/10 h-12 px-8 text-base">
                <MessageCircle className="mr-2 h-4 w-4" /> Suporte WhatsApp +258 {SUPPORT_PHONE}
              </Button>
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Precisa de ajuda? Ligue ou envie mensagem para <a href={`tel:+258${SUPPORT_PHONE}`} className="text-foreground font-semibold hover:underline">+258 {SUPPORT_PHONE}</a>
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const groups = [
    { title: "Produto", links: ["Funcionalidades", "Checkout", "Links", "QR Code", "Preços"] },
    { title: "Desenvolvedores", links: ["Documentação", "API REST", "SDKs", "Webhooks", "Status"] },
    { title: "Empresa", links: ["Sobre", "Carreiras", "Imprensa", "Parceiros", "Blog"] },
    { title: "Suporte", links: ["Centro de ajuda", "Contacto WhatsApp", "Comunidade", "Termos", "Privacidade"] },
  ];
  return (
    <footer className="liquid-glass mt-12">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="h-2.5 w-2.5 rounded-full bg-primary-glow shadow-[0_0_14px_var(--primary-glow)]" />
              REDOX <span className="text-gradient-red">PAY</span>
            </Link>
            <p className="mt-4 text-sm font-light text-muted-foreground">A forma mais rápida de receber pagamentos online em Moçambique.</p>
            <p className="mt-4 text-xs text-muted-foreground flex items-center gap-2"><Globe className="h-3 w-3" /> contacto@redoxpay.mz</p>
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
              <MessageCircle className="h-3 w-3" />
              <a href={WHATSAPP} target="_blank" rel="noreferrer" className="hover:text-foreground transition">Suporte: +258 {SUPPORT_PHONE}</a>
            </p>
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
