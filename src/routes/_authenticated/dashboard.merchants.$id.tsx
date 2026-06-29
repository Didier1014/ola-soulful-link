import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Copy, Eye, EyeOff, RefreshCw, Beaker } from "lucide-react";
import { getMerchant, updateMerchant, revokeMerchantApiKey } from "@/lib/merchants.functions";
import { runAdminTest } from "@/lib/admin-test.functions";
import { getPlatformConfig } from "@/lib/platform-config.functions";
import { calcSplit, MIN_AMOUNT, type SplitMethod } from "@/lib/split";

export const Route = createFileRoute("/_authenticated/dashboard/merchants/$id")({
  ssr: false,
  component: MerchantDetail,
});

function copy(v: string, label = "Copiado") {
  navigator.clipboard.writeText(v); toast.success(label);
}

function MerchantDetail() {
  const { id } = Route.useParams();
  const get = useServerFn(getMerchant);
  const update = useServerFn(updateMerchant);
  const revoke = useServerFn(revokeMerchantApiKey);
  const q = useQuery({ queryKey: ["merchant", id], queryFn: () => get({ data: { id } }) });

  const [showKey, setShowKey] = useState(false);
  const [simAmount, setSimAmount] = useState(100);
  const [simMethod, setSimMethod] = useState<SplitMethod>("mpesa");
  const sim = useMemo(() => calcSplit(Math.max(simAmount || 0, 0), simMethod), [simAmount, simMethod]);

  if (q.isLoading) return <p className="text-muted-foreground">A carregar…</p>;
  if (!q.data) return <p>Merchant não encontrado</p>;

  const m = q.data.merchant;
  const txs = q.data.transactions;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/dashboard/merchants"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Voltar</Button></Link>
        <h1 className="text-2xl font-bold">{m.name}</h1>
        <Badge variant={m.active ? "default" : "secondary"}>{m.active ? "Activo" : "Inactivo"}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <TestTransactionButton merchantId={m.id} />
          <Label className="text-xs">Activo</Label>
          <Switch checked={m.active} onCheckedChange={async (v) => {
            try { await update({ data: { id: m.id, active: v } }); toast.success(v ? "Activado" : "Desactivado"); q.refetch(); }
            catch (e: any) { toast.error(e.message); }
          }} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-card p-5 space-y-3">
          <h2 className="font-semibold">Payout</h2>
          <Field label="M-Pesa" value={m.payout_mpesa} />
          <Field label="E-Mola" value={m.payout_emola} />
          <Field label="Email" value={m.email} mono={false} />
        </div>

        <div className="rounded-xl border border-white/10 bg-card p-5 space-y-3">
          <h2 className="font-semibold">Credenciais</h2>
          <Field label="Client ID" value={m.client_id} />
          <div>
            <Label className="text-xs text-muted-foreground">API Key</Label>
            <div className="flex gap-2 mt-1">
              <Input readOnly value={showKey ? m.api_key : m.api_key.replace(/./g, "•")} className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
              <Button size="icon" variant="outline" onClick={() => copy(m.api_key, "API Key copiada")}><Copy className="h-4 w-4" /></Button>
            </div>
            <Button size="sm" variant="ghost" className="mt-2 text-destructive" onClick={async () => {
              if (!confirm("Revogar a API Key actual? A anterior deixa de funcionar.")) return;
              try { await revoke({ data: { id: m.id } }); toast.success("Nova API Key gerada"); q.refetch(); }
              catch (e: any) { toast.error(e.message); }
            }}><RefreshCw className="h-3.5 w-3.5" /> Revogar API Key</Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-card p-5">
        <h2 className="font-semibold mb-3">Simulador de split</h2>
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <div>
            <Label>Valor (MT)</Label>
            <Input type="number" min={MIN_AMOUNT} value={simAmount} onChange={e => setSimAmount(Number(e.target.value))} />
          </div>
          <div>
            <Label>Método</Label>
            <div className="flex gap-2 mt-1">
              <Button variant={simMethod === "mpesa" ? "default" : "outline"} onClick={() => setSimMethod("mpesa")}>M-Pesa</Button>
              <Button variant={simMethod === "emola" ? "default" : "outline"} onClick={() => setSimMethod("emola")}>E-Mola</Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
          <Stat label="Bruto" v={sim.gross} />
          <Stat label="Taxa plataforma" v={sim.platformFee} />
          <Stat label="Custo RLX" v={sim.rlxCost} />
          <Stat label="Lucro plataforma" v={sim.ownerProfit} accent />
          <Stat label="Merchant recebe" v={sim.merchantNet} accent />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Provider {simMethod === "mpesa" ? "M-Pesa" : "E-Mola"}: <span className="font-mono">{sim.providerPhone}</span>
          {simAmount < MIN_AMOUNT && <span className="text-destructive ml-2">⚠ valor mínimo é {MIN_AMOUNT} MT</span>}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-card overflow-hidden">
        <div className="p-5 pb-3"><h2 className="font-semibold">Últimas transacções</h2></div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Pagador</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">Bruto</TableHead>
              <TableHead className="text-right">Lucro</TableHead>
              <TableHead className="text-right">Merchant</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {txs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Sem transacções ainda.</TableCell></TableRow>}
            {txs.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="text-xs">{new Date(t.created_at).toLocaleString("pt-PT")}</TableCell>
                <TableCell className="font-mono text-xs">{t.payer_phone}</TableCell>
                <TableCell className="uppercase text-xs">{t.method}</TableCell>
                <TableCell className="text-right">{Number(t.gross).toFixed(2)}</TableCell>
                <TableCell className="text-right text-primary">{Number(t.owner_profit).toFixed(2)}</TableCell>
                <TableCell className="text-right">{Number(t.merchant_net).toFixed(2)}</TableCell>
                <TableCell><StatusBadge s={t.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Field({ label, value, mono = true }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input readOnly value={value ?? "—"} className={mono ? "font-mono text-sm" : "text-sm"} />
        {value && <Button size="icon" variant="outline" onClick={() => copy(value)}><Copy className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}

function Stat({ label, v, accent }: { label: string; v: number; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "border-primary/40 bg-primary/5" : "border-white/10 bg-background/40"}`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-bold">{v.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">MT</span></p>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const variant = s === "success" ? "default" : s === "failed" ? "destructive" : "secondary";
  const label = s === "success" ? "Pago" : s === "failed" ? "Falhou" : "Pendente";
  return <Badge variant={variant as any}>{label}</Badge>;
}
