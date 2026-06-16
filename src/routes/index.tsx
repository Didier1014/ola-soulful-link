import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import {
  ArrowRight, MessageCircle, Smartphone, Zap, Code2, Repeat,
  QrCode, Link as LinkIcon, Clock, BarChart3, ShieldCheck, Lock,
  Fingerprint, AlertTriangle, TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Redox Pay — Receba pagamentos em Moçambique (M-Pesa & e-Mola)" },
      { name: "description", content: "Aceite M-Pesa e e-Mola no seu site, app, link ou QR Code. Liquidação em tempo real, taxas justas e painel inteligente." },
      { property: "og:title", content: "Redox Pay — Pagamentos online em Moçambique" },
      { property: "og:description", content: "Checkout rápido, API moderna e liquidação em tempo real para M-Pesa e e-Mola." },
    ],
  }),
  component: Landing,
});

const stats = [
  { v: "1.6M+", l: "Transações" },
  { v: "130k+", l: "Movimentados/dia" },
  { v: "<1s", l: "Confirmação" },
  { v: "99.4%", l: "Taxa de sucesso" },
];

const features = [
  { i: Smartphone, t: "M-Pesa & e-Mola", d: "Receba diretamente nas carteiras móveis em segundos." },
  { i: Zap, t: "Checkout rápido", d: "Páginas otimizadas para máxima conversão." },
  { i: Code2, t: "API & SDKs", d: "API REST moderna, webhooks e SDKs prontos." },
  { i: Repeat, t: "Recorrência", d: "Cobranças automáticas e planos de assinatura." },
  { i: QrCode, t: "QR Code", d: "Gere QR dinâmicos para receber em qualquer lugar." },
  { i: LinkIcon, t: "Links de pagamento", d: "Partilhe via WhatsApp, SMS ou email." },
  { i: Clock, t: "Transferências 24/7", d: "Liquidação em tempo real, todos os dias." },
  { i: BarChart3, t: "Relatórios", d: "Dashboards completos e exportações." },
];

const security = [
  { i: Lock, t: "Criptografia AES-256 e TLS 1.3", d: "Dados protegidos em trânsito e em repouso." },
  { i: AlertTriangle, t: "Antifraude em tempo real", d: "Análise de risco em cada transação." },
  { i: ShieldCheck, t: "Infra PCI-DSS", d: "Padrão internacional de pagamentos." },
  { i: Fingerprint, t: "2FA e biometria", d: "Autenticação reforçada e tokens rotativos." },
];

const txs = [
  { n: "Aisha M.", m: "M-Pesa", v: "MZN 4.500", c: "M" },
  { n: "Bruno Sitoe", m: "e-Mola", v: "MZN 1.200", c: "e" },
  { n: "Carla Macuácua", m: "M-Pesa", v: "MZN 8.750", c: "M" },
  { n: "Délcio Nhaca", m: "e-Mola", v: "MZN 2.450", c: "e" },
];

const testimonials = [
  { q: "Em 1 semana migrámos todo o checkout. Conversão subiu 34%.", n: "Hélder Mucavele", r: "CEO, Loja Online MZ", i: "HM" },
  { q: "O suporte é fantástico e a liquidação chega no mesmo dia.", n: "Lúcia Tembe", r: "Fundadora, Beleza Maputo", i: "LT" },
  { q: "API limpa, webhooks confiáveis. Integração feita em horas.", n: "Edson Mahumane", r: "CTO, EduTech", i: "EM" },
  { q: "Os meus clientes adoram pagar com M-Pesa em 2 segundos.", n: "Sara Cossa", r: "Diretora, Boutique Sol", i: "SC" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Operando em Moçambique · M-Pesa & e-Mola
          </div>
          <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            Receba pagamentos online em{" "}
            <span className="text-brand-gradient">Moçambique</span> com rapidez e segurança
          </h1>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Aceite M-Pesa e e-Mola no seu site, app, link ou QR Code. Liquidação em tempo real, taxas justas e um painel inteligente.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground btn-glow hover:brightness-110 transition">
              Criar conta grátis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/auth" className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm hover:bg-white/10 transition">Entrar</Link>
            <a href="https://wa.me/258840000000" className="inline-flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground hover:text-foreground">
              <MessageCircle className="h-4 w-4" /> Falar com suporte
            </a>
          </div>

          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.l} className="card-soft rounded-2xl px-5 py-6">
                <div className="text-2xl md:text-3xl font-bold text-brand-gradient">{s.v}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-primary font-semibold">Checkout em 2 segundos</div>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold">Pague do seu jeito, em segundos</h2>
          <p className="mt-3 text-muted-foreground">Experiência de pagamento nativa para M-Pesa e e-Mola.</p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {[
            { s: "Passo 1", t: "Escolha o método", d: "Cliente seleciona M-Pesa ou e-Mola no checkout." },
            { s: "Passo 2", t: "Insere o número", d: "Confirma no telemóvel com PIN da carteira." },
            { s: "Passo 3", t: "Confirmado", d: "Pagamento processado em menos de 2 segundos." },
          ].map((x) => (
            <div key={x.s} className="card-soft rounded-2xl p-6">
              <div className="text-xs text-primary">{x.s}</div>
              <h3 className="mt-2 text-lg font-semibold">{x.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{x.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white text-xs font-bold">M</span> M-Pesa
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-500 text-black text-xs font-bold">e</span> e-Mola
          </span>
        </div>
      </section>

      {/* FEATURES */}
      <section id="funcionalidades" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-primary font-semibold">Funcionalidades</div>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold">Tudo o que precisa para receber</h2>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.t} className="card-soft rounded-2xl p-6 hover:border-primary/30 transition">
              <f.i className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECURITY */}
      <section id="seguranca" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs uppercase tracking-widest text-primary font-semibold">Segurança</div>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold">Confiança em cada transação</h2>
          <p className="mt-3 text-muted-foreground">Construído com os mais altos padrões de segurança bancária para proteger o seu negócio e os seus clientes.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {["PCI-DSS", "ISO 27001", "SOC 2", "GDPR"].map((b) => (
              <span key={b} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">{b}</span>
            ))}
          </div>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {security.map((s) => (
            <div key={s.t} className="card-soft rounded-2xl p-6">
              <s.i className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section id="painel" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary font-semibold">Painel inteligente</div>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold">Gestão completa do seu negócio</h2>
            <p className="mt-4 text-muted-foreground">Vendas em tempo real, taxas, relatórios, estornos e antecipação de recebíveis.</p>
            <ul className="mt-6 space-y-3 text-sm">
              {["Saldo e fluxo de caixa em tempo real", "Conciliação automática por canal", "Exportações em CSV e PDF", "Webhooks e API REST"].map((x) => (
                <li key={x} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{x}</li>
              ))}
            </ul>
          </div>
          <div className="card-soft rounded-3xl p-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                { l: "Saldo disponível", v: "MZN 1.284.530", d: "+12.4%" },
                { l: "Receita do mês", v: "MZN 482.110", d: "+28.9%" },
                { l: "Taxa de sucesso", v: "99.4%", d: "+0.2%" },
              ].map((k) => (
                <div key={k.l} className="rounded-xl bg-white/5 p-3 border border-white/5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
                  <div className="mt-1 text-sm font-semibold">{k.v}</div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1"><TrendingUp className="h-3 w-3" />{k.d}</div>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Transações recentes</h4>
                <span className="text-[11px] text-emerald-400 inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />Crescendo</span>
              </div>
              <div className="mt-3 divide-y divide-white/5">
                {txs.map((t) => (
                  <div key={t.n} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${t.m === "M-Pesa" ? "bg-red-500 text-white" : "bg-amber-500 text-black"}`}>{t.c}</span>
                      <div>
                        <div className="text-sm font-medium">{t.n}</div>
                        <div className="text-[11px] text-muted-foreground">{t.m}</div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{t.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-primary font-semibold">Depoimentos</div>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold">Negócios que confiam na Redox</h2>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {testimonials.map((t) => (
            <div key={t.n} className="card-soft rounded-2xl p-6">
              <p className="text-sm leading-relaxed">“{t.q}”</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/20 text-primary text-xs font-bold">{t.i}</div>
                <div>
                  <div className="text-sm font-medium">{t.n}</div>
                  <div className="text-[11px] text-muted-foreground">{t.r}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="card-soft relative overflow-hidden rounded-3xl p-10 text-center">
          <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
          <h2 className="relative text-3xl md:text-4xl font-bold">Comece a receber em minutos</h2>
          <p className="relative mt-3 text-muted-foreground">Sem mensalidades, sem instalação. Crie a sua conta e aceite o primeiro pagamento hoje.</p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground btn-glow hover:brightness-110 transition">
              Criar conta grátis <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="https://wa.me/258840000000" className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm hover:bg-white/10 transition">Falar com suporte</a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
