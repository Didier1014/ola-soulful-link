// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createWithdrawal, getDashboardStats, listMyWithdrawals } from "@/lib/transactions.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { Wallet, Clock, CheckCircle2, XCircle, Loader2, History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/withdrawals")({
  component: WdPage,
});

const fmt = (n: number) => `${new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(n)} MT`;

const statusMeta: Record<string, { label: string; icon: any; cls: string }> = {
  pending: { label: "Pendente", icon: Clock, cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  processing: { label: "Em processamento", icon: Loader2, cls: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  paid: { label: "Pago", icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  rejected: { label: "Rejeitado", icon: XCircle, cls: "bg-red-500/15 text-red-600 border-red-500/30" },
};

function WdPage() {
  const qc = useQueryClient();
  const fetchStats = useServerFn(getDashboardStats);
  const fetchMine = useServerFn(listMyWithdrawals);
  const create = useServerFn(createWithdrawal);

  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats() });
  const { data: mine = [] } = useQuery({ queryKey: ["my-withdrawals"], queryFn: () => fetchMine() });

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"mpesa" | "emola" | "bank">("mpesa");
  const [destination, setDestination] = useState("");

  // Realtime: refresh on any withdrawal change
  useEffect(() => {
    let ch: any;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) return;
      ch = supabase.channel(`my-wd-${uid}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals", filter: `user_id=eq.${uid}` }, () => {
          qc.invalidateQueries({ queryKey: ["my-withdrawals"] });
          qc.invalidateQueries({ queryKey: ["stats"] });
        })
        .subscribe();
    })();
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [qc]);

  const pendingTotal = useMemo(
    () => mine.filter((w: any) => w.status === "pending" || w.status === "processing")
              .reduce((s: number, w: any) => s + Number(w.amount_mzn), 0),
    [mine],
  );
  const available = Math.max(0, Number(stats?.balance ?? 0) - pendingTotal);

  const m = useMutation({
    mutationFn: () => create({ data: { amount_mzn: Number(amount), method, destination } }),
    onSuccess: () => {
      toast.success("Pedido de saque enviado — aguardando aprovação");
      setAmount(""); setDestination("");
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["my-withdrawals"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const canSubmit = !!amount && !!destination && !m.isPending && Number(amount) >= 100 && Number(amount) <= available;

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight">Saques</h1>
        <p className="text-sm text-muted-foreground">Solicite o envio do seu saldo. O pagamento é processado após aprovação do admin.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Saldo total</div>
          <p className="mt-1 text-2xl font-semibold">{fmt(Number(stats?.balance ?? 0))}</p>
        </Card>
        <Card className="rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Em pendentes</div>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{fmt(pendingTotal)}</p>
        </Card>
        <Card className="rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" /> Disponível</div>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{fmt(available)}</p>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold">Novo pedido</h2>
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Valor (MT) — mínimo 100</Label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={100} className="h-12 bg-secondary border-0 rounded-xl" />
          {amount && Number(amount) > available && (
            <p className="text-xs text-red-500">Excede o disponível ({fmt(available)})</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Método</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["mpesa", "emola", "bank"] as const).map(o => (
              <button key={o} onClick={() => setMethod(o)} className={`h-16 rounded-xl text-base font-medium border flex items-center justify-center gap-2 ${method === o ? "bg-foreground text-background border-foreground" : "bg-card border-border"}`}>
                {o !== "bank" && <img src={o === "mpesa" ? "/brands/mpesa.png" : "/brands/emola.png"} alt={o === "mpesa" ? "M-Pesa" : "e-Mola"} className="w-7 h-7 shrink-0" />}
                {o === "mpesa" ? "M-Pesa" : o === "emola" ? "e-Mola" : "Banco"}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{method === "bank" ? "IBAN / NIB" : "Número de telefone"}</Label>
          <Input value={destination} onChange={(e) => setDestination(e.target.value)} className="h-12 bg-secondary border-0 rounded-xl" />
        </div>
        <Button onClick={() => m.mutate()} disabled={!canSubmit} className="w-full h-12 rounded-xl bg-foreground text-background">
          {m.isPending ? "A enviar..." : "Solicitar saque"}
        </Button>
      </Card>

      <Card className="rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Histórico de saques</h2>
          <span className="text-xs text-muted-foreground">({mine.length})</span>
        </div>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Ainda não fez nenhum pedido de saque.</p>
        ) : (
          <div className="divide-y divide-border">
            {mine.map((w: any) => {
              const s = statusMeta[w.status] ?? statusMeta.pending;
              const Icon = s.icon;
              return (
                <div key={w.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{fmt(Number(w.amount_mzn))}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {w.method.toUpperCase()} · {w.destination} · {new Date(w.created_at).toLocaleString("pt-MZ")}
                    </p>
                  </div>
                  <Badge variant="outline" className={`gap-1 ${s.cls}`}>
                    <Icon className={`h-3 w-3 ${w.status === "processing" ? "animate-spin" : ""}`} />
                    {s.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
