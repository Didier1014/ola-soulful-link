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
import { runMerchantTest } from "@/lib/merchant-test.functions";
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

function TestTransactionButton({ merchantId }: { merchantId: string }) {
  const [open, setOpen] = useState(false);
  const fnTest = useServerFn(runMerchantTest);
  const [phone, setPhone] = useState("847123456");
  const [amount, setAmount] = useState(50);
  const [method, setMethod] = useState<SplitMethod>("mpesa");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    setBusy(true); setResult(null);
    try {
      const r: any = await fnTest({ data: { merchant_id: merchantId, payer_phone: phone, amount: Number(amount), method } });
      setResult(r);
      toast.success(`Teste executado: ${r.status}`);
    } catch (e: any) {
      setResult({ error: e?.message ?? "Erro" });
      toast.error(e?.message ?? "Erro");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setResult(null); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Beaker className="h-3.5 w-3.5" /> Testar C2B</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Testar transação C2B</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          Vai disparar um pagamento real na RLX usando os teus números de payout. O cliente recebe o pedido USSD/STK no telefone abaixo. Marcado como <b>teste</b> — não conta nos relatórios.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>Telefone do pagador</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <div><Label>Valor (MT)</Label><Input type="number" min={MIN_AMOUNT} value={amount} onChange={e => setAmount(Number(e.target.value))} /></div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={method === "mpesa" ? "default" : "outline"} onClick={() => setMethod("mpesa")}>M-Pesa</Button>
          <Button size="sm" variant={method === "emola" ? "default" : "outline"} onClick={() => setMethod("emola")}>E-Mola</Button>
        </div>

        {result && (
          <div className="rounded-lg border border-white/10 bg-background/40 p-3 text-xs space-y-1 max-h-72 overflow-auto">
            {result.error ? (
              <p className="text-destructive">{result.error}</p>
            ) : (
              <>
                <p><span className="text-muted-foreground">Status:</span> <span className="font-mono font-bold">{result.status}</span></p>
                {result.partner_transaction_id && <p><span className="text-muted-foreground">TxID:</span> <span className="font-mono">{result.partner_transaction_id}</span></p>}
                {result.split && (
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    <span>Bruto: <b>{result.split.gross}</b></span>
                    <span>Taxa plat.: <b>{result.split.platformFee}</b></span>
                    <span>Custo RLX: <b>{result.split.rlxCost}</b></span>
                    <span className="text-primary">Lucro: <b>{result.split.ownerProfit}</b></span>
                    <span className="col-span-2 text-primary">Merchant: <b>{result.split.merchantNet}</b></span>
                  </div>
                )}
                {result.rlx_response && <pre className="mt-2 text-[10px] whitespace-pre-wrap break-all opacity-80">{JSON.stringify(result.rlx_response, null, 2)}</pre>}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={run} disabled={busy}>{busy ? "A correr…" : "Correr teste"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
