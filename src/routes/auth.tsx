import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Redox Pay" },
      { name: "description", content: "Acesse o seu painel Redox Pay." },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [existingUser, setExistingUser] = useState<{ email: string } | null>(null);

  // shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // signup-only
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [accountType, setAccountType] = useState<"person" | "company">("person");
  const [city, setCity] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) {
        setExistingUser({ email: data.session.user.email });
      }
    });
  }, []);

  async function handleSwitchAccount() {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setExistingUser(null);
      setEmail("");
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            whatsapp,
            business_name: businessName,
            account_type: accountType,
            city,
          },
        },
      });
      if (error) throw error;
      if (data.session) {
        navigate({ to: "/dashboard" });
      } else {
        toast.success("Conta criada! Confirme o seu email antes de entrar.");
        setMode("login");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Verifique o seu email para redefinir a senha.");
      setMode("login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }




  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground relative overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-[500px] w-[500px] rounded-full bg-primary/25 blur-[160px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-primary-glow/15 blur-[140px]" />
      </div>

      {/* LEFT — brand */}
      <div className="relative hidden lg:flex flex-col justify-between p-12">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="h-2.5 w-2.5 rounded-full bg-primary-glow shadow-[0_0_14px_var(--primary-glow)]" />
          REDOX <span className="text-gradient-red">PAY</span>
        </Link>
        <div>
          <h2 className="text-5xl font-bold leading-[1.05] tracking-tight">
            Receba pagamentos<br />em <span className="text-gradient-red">Moçambique</span>
          </h2>
          <p className="mt-5 text-muted-foreground max-w-md text-lg">
            M-Pesa, e-Mola e mais. Checkout rápido, liquidação em tempo real, taxas justas.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
            {[
              { v: "1.6M+", l: "Transações" },
              { v: "99.4%", l: "Sucesso" },
              { v: "<2s", l: "Confirmação" },
              { v: "24/7", l: "Liquidação" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-2xl font-bold text-gradient-red">{s.v}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Redox Pay · Maputo, Moçambique</p>
      </div>

      {/* RIGHT — form */}
      <div className="flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 font-bold text-lg mb-8 justify-center">
            <span className="h-2 w-2 rounded-full bg-primary-glow" /> REDOX <span className="text-gradient-red">PAY</span>
          </Link>

          {existingUser && (
            <div className="space-y-5">
              <Header title="Já está conectado" subtitle="Continue na sua conta atual ou entre com outra." />
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Conta atual</p>
                <p className="mt-1 font-medium break-all">{existingUser.email}</p>
              </div>
              <Button onClick={() => navigate({ to: "/dashboard" })} className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground red-glow">
                Continuar como {existingUser.email.split("@")[0]} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button onClick={handleSwitchAccount} variant="outline" disabled={loading} className="w-full h-11 border-white/15 bg-white/5 hover:bg-white/10">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar com outra conta"}
              </Button>
            </div>
          )}

          {!existingUser && mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-5">
              <Header title="Entrar" subtitle="Acesse o seu painel Redox Pay" />


              <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={160} placeholder="voce@exemplo.com" /></Field>
              <Field label="Senha" right={<button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary-glow hover:text-primary-foreground">Esqueci</button>}>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={72} placeholder="••••••••" />
              </Field>
              <SubmitBtn loading={loading}>Entrar <ArrowRight className="ml-2 h-4 w-4" /></SubmitBtn>
              <Switcher>
                Não tem conta?{" "}
                <button type="button" onClick={() => setMode("signup")} className="text-primary-glow hover:underline font-medium">Criar agora</button>
              </Switcher>
            </form>
          )}

          {!existingUser && mode === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <Header title="Criar conta" subtitle="Comece a receber em minutos" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome completo"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={120} /></Field>
                <Field label="WhatsApp"><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required maxLength={20} placeholder="+258 84..." /></Field>
              </div>
              <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={160} /></Field>
              <Field label="Nome do negócio"><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={120} placeholder="Opcional" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo">
                  <div className="flex rounded-md border border-white/10 bg-white/[0.03] p-1">
                    {(["person", "company"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setAccountType(t)}
                        className={`flex-1 text-xs py-1.5 rounded ${accountType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                        {t === "person" ? "Pessoa" : "Empresa"}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Cidade"><Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} placeholder="Maputo" /></Field>
              </div>
              <Field label="Senha"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={72} placeholder="Mínimo 6 caracteres" /></Field>
              <SubmitBtn loading={loading}>Criar conta <ArrowRight className="ml-2 h-4 w-4" /></SubmitBtn>
              <Switcher>
                Já tem conta?{" "}
                <button type="button" onClick={() => setMode("login")} className="text-primary-glow hover:underline font-medium">Entrar</button>
              </Switcher>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-5">
              <Header title="Recuperar senha" subtitle="Enviaremos um link de redefinição para o seu email." />
              <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={160} /></Field>
              <SubmitBtn loading={loading}>Enviar link</SubmitBtn>
              <Switcher>
                <button type="button" onClick={() => setMode("login")} className="text-primary-glow hover:underline">← Voltar para entrar</button>
              </Switcher>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- subcomponents ---- */
function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>
    </div>
  );
}
function Field({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
        {right}
      </div>
      {children}
    </div>
  );
}
function SubmitBtn({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground red-glow" disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{children}</>}
    </Button>
  );
}
function Divider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
      <div className="relative flex justify-center text-xs"><span className="bg-background px-3 text-muted-foreground uppercase tracking-wider">ou com email</span></div>
    </div>
  );
}
function Switcher({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-sm text-muted-foreground">{children}</p>;
}
function GoogleBtn({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button type="button" variant="outline" className="w-full h-11 border-white/15 bg-white/5 hover:bg-white/10" onClick={onClick} disabled={disabled}>
      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      Continuar com Google
    </Button>
  );
}
