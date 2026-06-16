import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listSubscriptions, createSubscription, setSubscriptionStatus } from "@/lib/subscriptions.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RotateCcw, Pause, Play, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/subscriptions")({ component: Page });

const fmtMT = (n: number) => `${new Intl.NumberFormat("pt-MZ").format(n)} MT`;
const labelInterval: Record<string, string> = { weekly: "Semanal", monthly: "Mensal", yearly: "Anual" };

function Page() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listSubscriptions);
  const create = useServerFn(createSubscription);
  const setStatus = useServerFn(setSubscriptionStatus);
  const { data: subs = [] } = useQuery({ queryKey: ["subscriptions"], queryFn: () => fetchList() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", plan_name: "", amount_mzn: "", interval: "monthly" as "weekly" | "monthly" | "yearly" });

  const createM = useMutation({
    mutationFn: () => create({ data: { ...form, amount_mzn: Number(form.amount_mzn) } }),
    onSuccess: () => { toast.success("Recorrência criada"); setForm({ customer_name: "", customer_phone: "", plan_name: "", amount_mzn: "", interval: "monthly" }); setOpen(false); qc.invalidateQueries({ queryKey: ["subscriptions"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  const statusM = useMutation({ mutationFn: (v: { id: string; status: "active" | "paused" | "cancelled" }) => setStatus({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }) });

  return (
    <div className="space-y-4">
      <div className="px-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recorrência</h1>
          <p className="text-sm text-muted-foreground">Cobrança automática periódica</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white"><Plus className="h-4 w-4 mr-1" /> Novo</Button></DialogTrigger>
          <DialogContent className="bg-card border-white/10">
            <DialogHeader><DialogTitle>Nova recorrência</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Cliente</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></div>
              <div><Label>Plano</Label><Input value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} placeholder="ex. Premium Mensal" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor (MZN)</Label><Input type="number" value={form.amount_mzn} onChange={(e) => setForm({ ...form, amount_mzn: e.target.value })} /></div>
                <div>
                  <Label>Intervalo</Label>
                  <Select value={form.interval} onValueChange={(v: any) => setForm({ ...form, interval: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white" disabled={createM.isPending} onClick={() => createM.mutate()}>Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {subs.length === 0 ? (
        <Card className="p-10 text-center bg-white/5 border-white/10 rounded-2xl">
          <RotateCcw className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Sem recorrências</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {subs.map((s) => (
            <Card key={s.id} className="p-4 bg-white/5 border-white/10 rounded-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{s.plan_name}</p>
                  <p className="text-xs text-muted-foreground">{s.customer_name} • {s.customer_phone}</p>
                  <p className="mt-1 text-sm"><span className="text-primary-glow font-bold">{fmtMT(Number(s.amount_mzn))}</span> · {labelInterval[s.interval] || s.interval}</p>
                  {s.next_charge_at && <p className="mt-0.5 text-xs text-muted-foreground">Próxima: {new Date(s.next_charge_at).toLocaleDateString("pt-MZ")}</p>}
                </div>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${s.status === "active" ? "bg-emerald-500/15 text-emerald-400" : s.status === "paused" ? "bg-amber-500/15 text-amber-400" : "bg-destructive/15 text-destructive"}`}>{s.status}</span>
              </div>
              <div className="mt-3 flex gap-2">
                {s.status !== "active" && <Button size="sm" variant="outline" className="rounded-xl bg-white/5 border-white/10" onClick={() => statusM.mutate({ id: s.id, status: "active" })}><Play className="h-3.5 w-3.5 mr-1" /> Ativar</Button>}
                {s.status === "active" && <Button size="sm" variant="outline" className="rounded-xl bg-white/5 border-white/10" onClick={() => statusM.mutate({ id: s.id, status: "paused" })}><Pause className="h-3.5 w-3.5 mr-1" /> Pausar</Button>}
                {s.status !== "cancelled" && <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => statusM.mutate({ id: s.id, status: "cancelled" })}><X className="h-3.5 w-3.5 mr-1" /> Cancelar</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
