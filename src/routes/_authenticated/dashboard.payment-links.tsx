import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listLinks, createLink, toggleLink, deleteLink } from "@/lib/payment-links.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Copy, Link2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/payment-links")({ component: Page });

const fmtMT = (n: number) => `${new Intl.NumberFormat("pt-MZ").format(n)} MT`;

function Page() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listLinks);
  const create = useServerFn(createLink);
  const toggle = useServerFn(toggleLink);
  const del = useServerFn(deleteLink);
  const { data: links = [] } = useQuery({ queryKey: ["payment_links"], queryFn: () => fetchList() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", amount_mzn: "" });

  const createM = useMutation({
    mutationFn: () => create({ data: { title: form.title, description: form.description, amount_mzn: Number(form.amount_mzn) } }),
    onSuccess: () => { toast.success("Link criado"); setForm({ title: "", description: "", amount_mzn: "" }); setOpen(false); qc.invalidateQueries({ queryKey: ["payment_links"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  const toggleM = useMutation({ mutationFn: (v: { id: string; active: boolean }) => toggle({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_links"] }) });
  const delM = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["payment_links"] }); } });

  const copy = (slug: string) => { navigator.clipboard.writeText(`${window.location.origin}/l/${slug}`); toast.success("Link copiado"); };

  return (
    <div className="space-y-4">
      <div className="px-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Links de Pagamento</h1>
          <p className="text-sm text-muted-foreground">Cobre via link partilhável</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white"><Plus className="h-4 w-4 mr-1" /> Novo</Button></DialogTrigger>
          <DialogContent className="bg-card border-white/10">
            <DialogHeader><DialogTitle>Novo link</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Valor (MZN)</Label><Input type="number" value={form.amount_mzn} onChange={(e) => setForm({ ...form, amount_mzn: e.target.value })} /></div>
              <Button className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white" disabled={createM.isPending || !form.title || !form.amount_mzn} onClick={() => createM.mutate()}>Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {links.length === 0 ? (
        <Card className="p-10 text-center bg-white/5 border-white/10 rounded-2xl">
          <Link2 className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum link ainda</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {links.map((l) => (
            <Card key={l.id} className="p-4 bg-white/5 border-white/10 rounded-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{l.title}</p>
                  <p className="text-xs text-muted-foreground truncate">/l/{l.slug}</p>
                  <p className="mt-1 text-sm"><span className="text-primary-glow font-bold">{fmtMT(Number(l.amount_mzn))}</span> · {l.payments_count} pagos · {l.clicks} cliques</p>
                </div>
                <Switch checked={l.active} onCheckedChange={(v) => toggleM.mutate({ id: l.id, active: v })} />
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="rounded-xl bg-white/5 border-white/10" onClick={() => copy(l.slug)}><Copy className="h-3.5 w-3.5 mr-1" /> Copiar</Button>
                <Button size="sm" variant="outline" className="rounded-xl bg-white/5 border-white/10" asChild><a href={`/l/${l.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir</a></Button>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => delM.mutate(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
