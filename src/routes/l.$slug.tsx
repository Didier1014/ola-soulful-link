// @ts-nocheck
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getLinkBySlug, payLink } from "@/lib/payment-links.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Lock, Smartphone, Zap, AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/l/$slug")({ component: LinkCheckout });

const fmt = (n: number) => `${new Intl.NumberFormat("pt-MZ").format(n)} MT`;

function LinkCheckout() {
  const { slug } = useParams({ from: "/l/$slug" });
  const fetchLink = useServerFn(getLinkBySlug);
  const pay = useServerFn(payLink);

  const { data: link, isLoading, error } = useQuery({
    queryKey: ["link", slug],
    queryFn: () => fetchLink({ data: { slug } }),
    retry: false,
  });

  const [form, setForm] = useState({ customer_name: "", customer_email: "", customer_phone: "" });
  const [method, setMethod] = useState<"mpesa" | "emola">("mpesa");
  const [done, setDone] = useState<{ id: string; status: string } | null>(null);
  const trackingRef = useRef<Record<string, string>>({});

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const t: Record<string, string> = {};
      ["utm_source","utm_campaign","utm_medium","utm_content","utm_term","src","sck"].forEach((k) => {
        const v = sp.get(k); if (v) t[k] = v;
      });
      const cookie = document.cookie || "";
      const fbp = cookie.match(/_fbp=([^;]+)/)?.[1]; if (fbp) t.fbp = fbp;
      const fbc = cookie.match(/_fbc=([^;]+)/)?.[1] || (sp.get("fbclid") ? `fb.1.${Date.now()}.${sp.get("fbclid")}` : null);
      if (fbc) t.fbc = fbc;
      trackingRef.current = t;
    } catch {}
  }, []);

  const m = useMutation({
    mutationFn: () => pay({ data: { link_id: link!.id, method, ...form, tracking: trackingRef.current } }),
    onSuccess: (r) => {
      setDone(r);
      if (r.status === "paid") toast.success("Pagamento confirmado!");
      else if (r.status === "failed") toast.error("Pagamento falhou");
      else toast("Aprove no seu telefone");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (isLoading)
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (error || !link)
    return (
      <div className="min-h-screen grid place-items-center bg-background text-center px-4">
        <div>
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Link indisponível</h1>
          <p className="text-muted-foreground mt-2">Este link pode ter sido desactivado ou não existe.</p>
        </div>
      </div>
    );

  if (done)
    return (
      <div className="min-h-screen grid place-items-center bg-background p-4">
        <Card className="max-w-md w-full bg-white/5 border-white/10">
          <CardContent className="p-8 text-center space-y-3">
            <CheckCircle2 className="h-14 w-14 text-primary mx-auto" />
            <h1 className="text-2xl font-bold">
              {done.status === "paid" ? "Pagamento confirmado!" : done.status === "pending" ? "Pagamento pendente" : "Pagamento falhou"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {done.status === "paid" ? "Obrigado pelo seu pagamento." : done.status === "pending" ? "Aprove a transacção no seu telefone." : "Tente novamente."}
            </p>
            <p className="text-xs text-muted-foreground border-t border-white/10 pt-3">Ref: {done.id.slice(0, 8)}</p>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-primary-glow/10 blur-[120px]" />
      </div>
      <header className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-semibold">REDOX PAY</span>
          <span className="ml-auto flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" /> Pagamento seguro</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Card className="bg-white/5 border-white/10 rounded-2xl">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-sm uppercase tracking-wide text-muted-foreground">Os seus dados</h2>
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label>Email (opcional)</Label>
                <Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} maxLength={160} />
              </div>
              <div className="space-y-2">
                <Label>Telefone (M-Pesa / e-Mola)</Label>
                <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                  placeholder="+258 84 000 0000" maxLength={20} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 rounded-2xl">
            <CardContent className="p-6 space-y-3">
              <h2 className="text-sm uppercase tracking-wide text-muted-foreground">Método de pagamento</h2>
              <div className="grid grid-cols-2 gap-2">
                <MethodBtn active={method === "mpesa"} onClick={() => setMethod("mpesa")} label="M-Pesa" />
                <MethodBtn active={method === "emola"} onClick={() => setMethod("emola")} label="e-Mola" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="bg-white/5 border-white/10 rounded-2xl lg:sticky lg:top-6">
            <CardContent className="p-6 space-y-4">
              <div>
                <h1 className="text-xl font-bold">{link.title}</h1>
                {link.description && <p className="text-sm text-muted-foreground mt-1">{link.description}</p>}
              </div>
              <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">{fmt(Number(link.amount_mzn))}</span>
              </div>
              <Button
                className="w-full h-16 rounded-xl text-base bg-gradient-to-r from-primary to-primary-glow text-white"
                disabled={m.isPending || !form.customer_name || !form.customer_phone}
                onClick={() => m.mutate()}>
                {m.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                Pagar {fmt(Number(link.amount_mzn))}
              </Button>
              <p className="text-xs text-center text-muted-foreground">Protegido por REDOX PAY</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MethodBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  const isMpesa = label === "M-Pesa";
  return (
    <button onClick={onClick} type="button"
      className={`flex items-center justify-center gap-3 rounded-xl border p-5 text-base font-medium transition-colors ${
        active ? "border-primary bg-primary/10 text-primary" : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}>
      <img src={isMpesa ? "/brands/mpesa.png" : "/brands/emola.png"} alt={label} className="w-8 h-8 shrink-0" />
      {label}
    </button>
  );
}