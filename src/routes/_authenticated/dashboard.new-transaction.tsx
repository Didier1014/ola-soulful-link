import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { listMyProducts } from "@/lib/products.functions";
import { createCheckout } from "@/lib/transactions.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/new-transaction")({
  component: NewTransactionPage,
});

function fmtMT(n: number) {
  return new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", maximumFractionDigits: 0 }).format(n);
}

function NewTransactionPage() {
  const router = useRouter();
  const fetchList = useServerFn(listMyProducts);
  const charge = useServerFn(createCheckout);
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => fetchList() });

  const [method, setMethod] = useState<"mpesa"|"emola">("mpesa");
  const [phone, setPhone] = useState("258");
  const [name, setName] = useState("");
  const [productId, setProductId] = useState<string>("");
  const [amount, setAmount] = useState("");

  const selectedProduct = products.find(p => p.id === productId) ?? products[0];
  const displayAmount = amount ? Number(amount) : (selectedProduct ? Number(selectedProduct.price_mzn) : 0);

  const m = useMutation({
    mutationFn: () => {
      const pid = productId || products[0]?.id;
      if (!pid) throw new Error("Crie um produto primeiro");
      return charge({
        data: {
          product_id: pid,
          customer_name: name || "Cliente",
          customer_phone: phone,
          method,
          amount_mzn: amount ? Number(amount) : undefined,
        },
      });
    },
    onSuccess: () => { toast.success("Pedido enviado!"); router.navigate({ to: "/dashboard/transactions" }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const ready = !!phone && phone.length >= 9 && !!products.length && displayAmount >= 60;

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight">Nova transacção</h1>
        <p className="text-sm text-muted-foreground">Teste C2B com M-Pesa ou e-Mola. As taxas do sistema são aplicadas automaticamente.</p>
      </div>

      {selectedProduct && selectedProduct.cover_url && (
        <div className="rounded-2xl overflow-hidden h-48 bg-secondary">
          <img src={selectedProduct.cover_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Método</p>
        <div className="grid grid-cols-2 gap-2">
          {(["mpesa","emola"] as const).map(opt => {
            const isM = opt === "mpesa";
            return (
              <button key={opt} onClick={()=>setMethod(opt)}
                className={`h-20 rounded-xl text-base font-medium border transition-colors flex items-center justify-center gap-3 ${method===opt ? "bg-foreground text-background border-foreground" : "bg-card border-border text-foreground/80"}`}>
                <img src={isM ? "/brands/mpesa.png" : "/brands/emola.png"} alt={isM ? "M-Pesa" : "e-Mola"} className="w-8 h-8 shrink-0" />
                {isM ? "M-Pesa" : "e-Mola"}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Valor (MT)">
        <Input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder={selectedProduct ? String(Number(selectedProduct.price_mzn)) : "100"}
          className="h-12 bg-secondary border-0 rounded-xl text-lg font-semibold"
          min={60}
        />
        <p className="text-xs text-muted-foreground mt-1">Mínimo: 60 MT. Se vazio, usa o preço do produto.</p>
      </Field>

      <Field label="Número do cliente"><Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="258840000000" className="h-12 bg-secondary border-0 rounded-xl" /></Field>
      <Field label="Nome do cliente (opcional)"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Maria Silva" className="h-12 bg-secondary border-0 rounded-xl" /></Field>

      <Field label="Produto associado">
        <select value={productId} onChange={e=>setProductId(e.target.value)} className="h-12 w-full bg-secondary rounded-xl px-3 text-sm">
          {products.map(p => <option key={p.id} value={p.id}>{p.name} — {fmtMT(Number(p.price_mzn))}</option>)}
        </select>
      </Field>

      {displayAmount >= 60 && (
        <Card className="p-4 rounded-xl bg-card/40 border border-white/5">
          <div className="flex justify-between text-sm">
            <span>Valor</span>
            <span className="font-semibold">{fmtMT(displayAmount)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Taxa (15% + 15 MT)</span>
            <span>{fmtMT(Math.round((displayAmount * 0.15 + 15) * 100) / 100)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-border mt-2 pt-2">
            <span>Líquido para o vendedor</span>
            <span className="font-semibold text-emerald-400">
              {fmtMT(Math.round((displayAmount - (displayAmount * 0.15 + 15)) * 100) / 100)}
            </span>
          </div>
        </Card>
      )}

      <Button onClick={()=>m.mutate()} disabled={!ready || m.isPending} className="w-full h-16 rounded-xl text-base bg-foreground text-background disabled:bg-muted disabled:text-muted-foreground">
        {m.isPending ? "A enviar..." : `Pagar ${fmtMT(displayAmount)}`}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
