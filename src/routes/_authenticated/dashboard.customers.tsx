import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listCustomers, createCustomer, deleteCustomer } from "@/lib/customers.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/customers")({ component: Page });

const fmtMT = (n: number) => `${new Intl.NumberFormat("pt-MZ").format(n)} MT`;

function Page() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listCustomers);
  const create = useServerFn(createCustomer);
  const del = useServerFn(deleteCustomer);
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => fetchList() });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });

  const filtered = useMemo(() => customers.filter(c =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || "").includes(q)
  ), [customers, q]);

  const createM = useMutation({
    mutationFn: () => create({ data: form }),
    onSuccess: () => { toast.success("Cliente criado"); setForm({ name: "", phone: "", email: "", notes: "" }); setOpen(false); qc.invalidateQueries({ queryKey: ["customers"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["customers"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="px-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gerencie os seus pagadores</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white"><Plus className="h-4 w-4 mr-1" /> Novo</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10">
            <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+258..." /></div>
              <div><Label>Email (opcional)</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white" disabled={createM.isPending || !form.name || !form.phone} onClick={() => createM.mutate()}>Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Pesquisar..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-10 rounded-xl bg-white/5 border-white/10" />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center bg-white/5 border-white/10 rounded-2xl">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Sem clientes ainda</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Card key={c.id} className="p-4 bg-white/5 border-white/10 rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.phone}{c.email ? ` • ${c.email}` : ""}</p>
                <p className="text-xs mt-1">{c.purchases_count} compras • <span className="text-primary-glow font-semibold">{fmtMT(Number(c.total_spent_mzn))}</span></p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => delM.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
