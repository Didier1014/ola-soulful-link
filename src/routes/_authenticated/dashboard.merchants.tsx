import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Store, Plus, ExternalLink, Trash2 } from "lucide-react";
import { listMerchants, createMerchant, updateMerchant, deleteMerchant } from "@/lib/merchants.functions";

export const Route = createFileRoute("/_authenticated/dashboard/merchants")({
  ssr: false,
  component: MerchantsPage,
});

function MerchantsPage() {
  const list = useServerFn(listMerchants);
  const q = useQuery({ queryKey: ["merchants"], queryFn: () => list() });
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Store className="h-6 w-6" /> Merchants</h1>
          <p className="text-sm text-muted-foreground">Gere os teus merchants e o split automático em cada pagamento.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Novo merchant</Button>
          </DialogTrigger>
          <NewMerchantDialog onCreated={() => { setOpen(false); q.refetch(); }} />
        </Dialog>
      </div>

      <div className="rounded-xl border border-white/10 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>M-Pesa</TableHead>
              <TableHead>E-Mola</TableHead>
              <TableHead>Client ID</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acções</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">A carregar…</TableCell></TableRow>}
            {q.data?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem merchants ainda. Cria o primeiro.</TableCell></TableRow>}
            {q.data?.map((m: any) => (
              <MerchantRow key={m.id} merchant={m} onChange={() => q.refetch()} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MerchantRow({ merchant, onChange }: { merchant: any; onChange: () => void }) {
  const update = useServerFn(updateMerchant);
  const del = useServerFn(deleteMerchant);
  return (
    <TableRow>
      <TableCell className="font-medium">{merchant.name}</TableCell>
      <TableCell className="font-mono text-xs">{merchant.payout_mpesa ?? "—"}</TableCell>
      <TableCell className="font-mono text-xs">{merchant.payout_emola ?? "—"}</TableCell>
      <TableCell className="font-mono text-xs">{merchant.client_id}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch
            checked={merchant.active}
            onCheckedChange={async (v) => {
              try { await update({ data: { id: merchant.id, active: v } }); toast.success(v ? "Activado" : "Desactivado"); onChange(); }
              catch (e: any) { toast.error(e.message); }
            }}
          />
          <Badge variant={merchant.active ? "default" : "secondary"}>{merchant.active ? "Activo" : "Inactivo"}</Badge>
        </div>
      </TableCell>
      <TableCell className="text-right space-x-1">
        <Link to="/dashboard/merchants/$id" params={{ id: merchant.id }}>
          <Button size="sm" variant="outline"><ExternalLink className="h-3.5 w-3.5" /> Detalhe</Button>
        </Link>
        <Button size="sm" variant="ghost" onClick={async () => {
          if (!confirm(`Eliminar ${merchant.name}?`)) return;
          try { await del({ data: { id: merchant.id } }); toast.success("Eliminado"); onChange(); }
          catch (e: any) { toast.error(e.message); }
        }}><Trash2 className="h-3.5 w-3.5" /></Button>
      </TableCell>
    </TableRow>
  );
}

function NewMerchantDialog({ onCreated }: { onCreated: () => void }) {
  const create = useServerFn(createMerchant);
  const [form, setForm] = useState({ name: "", email: "", payout_mpesa: "", payout_emola: "" });
  const [busy, setBusy] = useState(false);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo merchant</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Nome completo *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Email (opcional)</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label>Número M-Pesa (84/85…)</Label><Input inputMode="numeric" maxLength={9} value={form.payout_mpesa} onChange={e => setForm({ ...form, payout_mpesa: e.target.value.replace(/\D/g, "") })} /></div>
        <div><Label>Número E-Mola (86/87…)</Label><Input inputMode="numeric" maxLength={9} value={form.payout_emola} onChange={e => setForm({ ...form, payout_emola: e.target.value.replace(/\D/g, "") })} /></div>
        <p className="text-xs text-muted-foreground">É obrigatório pelo menos um dos dois números.</p>
      </div>
      <DialogFooter>
        <Button disabled={busy} onClick={async () => {
          setBusy(true);
          try { await create({ data: form }); toast.success("Merchant criado"); onCreated(); }
          catch (e: any) { toast.error(e.message); }
          finally { setBusy(false); }
        }}>{busy ? "A criar…" : "Criar merchant"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
