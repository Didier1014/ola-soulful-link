import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createWithdrawal, getDashboardStats } from "@/lib/transactions.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/withdrawals")({
  component: WdPage,
});

const fmt = (n: number) => `${new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(n)} MT`;

function WdPage() {
  const qc = useQueryClient();
  const fetchStats = useServerFn(getDashboardStats);
  const create = useServerFn(createWithdrawal);
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats() });

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"mpesa"|"emola"|"bank">("mpesa");
  const [destination, setDestination] = useState("");

  const m = useMutation({
    mutationFn: () => create({ data: { amount_mzn: Number(amount), method, destination } }),
    onSuccess: () => { toast.success("Saque solicitado!"); setAmount(""); setDestination(""); qc.invalidateQueries({ queryKey: ["stats"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight">Saques</h1>
        <p className="text-sm text-muted-foreground">Solicite o envio do seu saldo.</p>
      </div>

      <Card className="rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Saldo disponível</div>
        <p className="mt-1 text-3xl font-semibold">{fmt(stats?.balance ?? 0)}</p>
      </Card>

      <Card className="rounded-2xl shadow-sm p-5 space-y-4">
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Valor (MT)</Label>
          <Input value={amount} onChange={e=>setAmount(e.target.value)} type="number" className="h-12 bg-secondary border-0 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Método</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["mpesa","emola","bank"] as const).map(o => (
              <button key={o} onClick={()=>setMethod(o)} className={`h-16 rounded-xl text-base font-medium border flex items-center justify-center gap-2 ${method===o ? "bg-foreground text-background border-foreground" : "bg-card border-border"}`}>
                {o !== "bank" && <img src={o === "mpesa" ? "/brands/mpesa.png" : "/brands/emola.png"} alt={o === "mpesa" ? "M-Pesa" : "e-Mola"} className="w-7 h-7 shrink-0" />}
                {o === "mpesa" ? "M-Pesa" : o === "emola" ? "e-Mola" : "Banco"}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{method === "bank" ? "IBAN / NIB" : "Número de telefone"}</Label>
          <Input value={destination} onChange={e=>setDestination(e.target.value)} className="h-12 bg-secondary border-0 rounded-xl" />
        </div>
        <Button onClick={()=>m.mutate()} disabled={!amount || !destination || m.isPending} className="w-full h-12 rounded-xl bg-foreground text-background">Solicitar saque</Button>
      </Card>
    </div>
  );
}
