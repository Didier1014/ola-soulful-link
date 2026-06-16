import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/SiteHeader";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Redox Pay" },
      { name: "description", content: "Acesse o seu painel Redox Pay." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  return <AuthLayout />;
}

export function AuthLayout() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo />
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
      </header>

      <main className="flex-1 grid lg:grid-cols-2 gap-12 px-6 lg:px-16 py-10 items-center">
        {/* Left side */}
        <div>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            Receba pagamentos<br />em <span className="text-brand-gradient">Moçambique</span>
          </h2>
          <p className="mt-5 text-muted-foreground max-w-md">
            M-Pesa, e-Mola e mais. Checkout rápido, liquidação em tempo real, taxas justas.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 max-w-md">
            {[
              { v: "1.6M+", l: "Transações" },
              { v: "99.4%", l: "Sucesso" },
              { v: "<2s", l: "Confirmação" },
              { v: "24/7", l: "Liquidação" },
            ].map((s) => (
              <div key={s.l} className="card-soft rounded-2xl px-5 py-4">
                <div className="text-xl font-bold text-brand-gradient">{s.v}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - form */}
        <div className="card-soft rounded-3xl p-8 max-w-md w-full justify-self-center lg:justify-self-end relative">
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-primary/30 to-transparent opacity-50 pointer-events-none" />
          <div className="relative">
            <h1 className="text-3xl font-bold">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login" ? "Acesse o seu painel Redox Pay" : "Comece a receber em minutos"}
            </p>

            <button className="mt-6 w-full inline-flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition py-3 text-sm font-medium">
              <GoogleIcon /> Continuar com Google
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">ou com email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              {mode === "signup" && (
                <Field label="Nome">
                  <input type="text" placeholder="O seu nome" className="input" />
                </Field>
              )}
              <Field label="Email">
                <input type="email" placeholder="voce@exemplo.com" className="input" />
              </Field>
              <Field label="Senha" trailing={mode === "login" ? <a href="#" className="text-xs text-primary hover:underline">Esqueci</a> : undefined}>
                <input type="password" placeholder="••••••••" className="input" />
              </Field>

              <button
                type="submit"
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground btn-glow hover:brightness-110 transition"
              >
                {mode === "login" ? "Entrar" : "Criar conta"} <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
              <button
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-primary hover:underline font-medium"
              >
                {mode === "login" ? "Criar agora" : "Entrar"}
              </button>
            </p>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        © 2026 Redox Pay · Maputo, Moçambique
      </footer>

      <style>{`
        .input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: inherit;
          outline: none;
          transition: border-color .15s, background .15s;
        }
        .input:focus { border-color: var(--primary); background: rgba(255,255,255,0.06); }
        .input::placeholder { color: var(--muted-foreground); }
      `}</style>
    </div>
  );
}

function Field({ label, trailing, children }: { label: string; trailing?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        {trailing}
      </div>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.4 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 11.5-4.8 11.5-11.6 0-.8-.1-1.4-.2-1.9H12z"/>
    </svg>
  );
}
