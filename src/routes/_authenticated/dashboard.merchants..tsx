
function TestTransactionButton({ merchantId }: { merchantId: string }) {
  const [open, setOpen] = useState(false);
  const fnCfg = useServerFn(getPlatformConfig);
  const fnTest = useServerFn(runAdminTest);
  const cfg = useQuery({ queryKey: ["platform_config"], queryFn: () => fnCfg(), enabled: open, retry: false });
  const [phone, setPhone] = useState("847123456");
  const [amount, setAmount] = useState(50);
  const [method, setMethod] = useState<SplitMethod>("mpesa");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const mode = cfg.data?.test_mode ?? "merchant";

  const run = async () => {
    setBusy(true); setResult(null);
    try {
      const r = await fnTest({ data: { merchant_id: merchantId, payer_phone: phone, amount: Number(amount), method } });
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
        <Button size="sm" variant="outline"><Beaker className="h-3.5 w-3.5" /> Testar Transação</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Testar transação · modo <span className="font-mono">{mode}</span></DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          {mode === "merchant"
            ? "Vai chamar internamente o fluxo da API pública com a api_key real deste merchant. Marcado como is_test=true — não conta nos KPIs."
            : "Vai chamar directamente a RLX com os payouts da plataforma, ignorando este merchant. Útil só para confirmar conectividade à gateway."}
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
