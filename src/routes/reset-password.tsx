import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Nova senha — Redox Pay" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase parses recovery token from URL hash on load.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Fallback: if session already exists
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error("As senhas não coincidem");
    if (password.length < 6) return toast.error("Mínimo 6 caracteres");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Senha atualizada!");
      setTimeout(() => navigate({ to: "/dashboard" }), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[520px] rounded-full bg-primary/20 blur-[140px]" />
      </div>

      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg justify-center mb-8">
          <span className="h-2 w-2 rounded-full bg-primary-glow shadow-[0_0_12px_var(--primary-glow)]" />
          REDOX <span className="text-gradient-red">PAY</span>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur p-8">
          {done ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <h1 className="mt-4 text-2xl font-bold">Senha atualizada</h1>
              <p className="mt-2 text-sm text-muted-foreground">A redirecionar para o painel...</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">A validar link...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Nova senha</h1>
                <p className="mt-1 text-sm text-muted-foreground">Defina uma nova senha para a sua conta.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nova senha</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={72} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Confirmar senha</Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} maxLength={72} />
              </div>
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground red-glow" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Atualizar senha <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
