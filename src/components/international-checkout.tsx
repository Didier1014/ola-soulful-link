import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Lock, ShieldCheck, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initializeInternationalCheckout } from "@/lib/international-checkout.functions";
import { formatProductPrice } from "@/lib/checkout-currency";
import { PAYSTACK_PUBLIC_KEY } from "@/lib/paystack-config";

type Product = { id: string; name: string; price_mzn: number; price_amount?: number | null; currency?: string; checkout_provider?: string; cover_url?: string | null };

async function openPaystack(accessCode: string, onSuccess: () => void, onCancel: () => void) {
  const host = window as unknown as { PaystackPop?: new () => { resumeTransaction: (code: string, options: { onSuccess: () => void; onCancel: () => void; onError: () => void }) => void } };
  if (!host.PaystackPop) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v2/inline.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Não foi possível abrir o pagamento seguro"));
      document.head.appendChild(script);
    });
  }
  if (!host.PaystackPop) throw new Error("Pagamento seguro indisponível");
  new host.PaystackPop().resumeTransaction(accessCode, { onSuccess, onCancel, onError: onCancel });
}

export function InternationalCheckout({ product }: { product: Product }) {
  const initialize = useServerFn(initializeInternationalCheckout);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resume, setResume] = useState<{ access_code: string; authorization_url: string } | null>(null);
  const stripe = product.checkout_provider === "stripe";
  const price = formatProductPrice(product);

  async function pay() {
    setBusy(true); setError("");
    try {
      const result = await initialize({ data: { product_id: product.id, name, email } });
      sessionStorage.setItem(`rdx-paystack:${result.reference}`, result.capability);
      setResume(result);
      await openPaystack(result.access_code, () => { window.location.assign(`/international-return?reference=${encodeURIComponent(result.reference)}`); }, () => { setBusy(false); setError("Pagamento interrompido. Pode continuar quando quiser."); });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível iniciar o pagamento");
      setBusy(false);
    }
  }

  return <div className="international-checkout min-h-screen bg-background text-foreground" data-paystack-public-key={stripe ? undefined : PAYSTACK_PUBLIC_KEY}>
    <div className="international-page mx-auto px-5 pb-10">
      <header className="international-header flex items-center justify-between gap-4">
        <a href="/" className="international-wordmark text-primary font-extrabold leading-tight"><span className="international-logo">R</span>REDOX PAY</a>
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs"><Lock className="size-3" />Pagamento seguro</span>
      </header>
      <div className="international-form mx-auto">
      <div className="h-0.5 w-7 bg-primary rounded-full mb-5" />
      <section className="pb-5 border-b border-border">
        <div className="flex justify-between items-center gap-4 mb-4"><h1 className="text-sm font-semibold">Resumo da compra</h1><span className="border border-border rounded-full px-3 py-1 text-xs">{product.currency}</span></div>
        <div className="flex gap-3 items-center mb-3">{product.cover_url && <img src={product.cover_url} alt={product.name} className="size-12 object-cover rounded-md" />}<h2 className="text-lg font-bold break-words min-w-0">{product.name}</h2></div>
        <p className="text-3xl font-bold break-words">{price}<span className="text-xs font-medium text-muted-foreground ml-1.5">{product.currency}</span></p>
      </section>
      <form onSubmit={event => { event.preventDefault(); void pay(); }} className="pt-5 space-y-5">
        <h2 className="flex items-center gap-2 font-semibold text-sm"><span className="international-step">1</span>Seus dados</h2>
        <div className="space-y-1"><Label htmlFor="international-name">Nome completo</Label><Input id="international-name" autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="international-email">E-mail</Label><Input id="international-email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required maxLength={160} value={email} onChange={event => setEmail(event.target.value)} /></div>
        <div className="flex justify-between items-center gap-2 pt-1"><h2 className="flex items-center gap-2 font-semibold text-sm"><span className="international-step">2</span>Pagamento</h2><span className="text-muted-foreground text-xs flex gap-1 items-center"><CreditCard className="size-3" />Cartão de crédito</span></div>
        <div className="international-payment-method flex items-center justify-between gap-3"><div className="flex gap-3 items-center"><CreditCard className="size-5 text-primary" /><div><p className="font-medium text-sm">{stripe ? "Stripe" : "Paystack"}</p><p className="text-xs text-muted-foreground">Cartão · pagamento encriptado</p></div></div><ShieldCheck className="size-4 text-success" /></div>
        {stripe && <p role="status" className="text-sm text-muted-foreground">Pagamentos Stripe ainda não disponíveis.</p>}
        {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
        <Button type="submit" disabled={busy || stripe} className="international-purchase w-full h-auto min-h-11 py-3 text-sm font-semibold whitespace-normal gap-1.5">{busy ? <Loader2 className="size-4 animate-spin shrink-0" /> : <Lock className="size-4 shrink-0" />}Finalizar compra · {price}</Button>
        {resume && !busy && <Button type="button" variant="outline" className="w-full" onClick={() => window.location.assign(resume.authorization_url)}>Continuar na Paystack<ArrowRight className="size-4" /></Button>}
        <p className="text-center text-[10px] text-muted-foreground">Cobrança em {product.currency}</p>
      </form>
      <section className="international-security mt-3 border border-border rounded-lg px-4 py-4 text-center">
        <div className="flex justify-center gap-2 items-center mb-4"><span className="international-card-brand font-bold italic">VISA</span><span className="international-card-brand font-semibold">Mastercard</span></div>
        <div className="grid grid-cols-2 gap-4 text-muted-foreground text-[10px]"><div><ShieldCheck className="size-3.5 text-success mx-auto mb-1.5" />Pagamento 100% seguro</div><div><Lock className="size-3.5 text-primary mx-auto mb-1.5" />Dados encriptados (SSL)</div></div>
      </section>
      <footer className="flex justify-center items-center gap-1.5 text-muted-foreground text-xs pt-5"><Lock className="size-3" />Checkout por <strong className="text-foreground">Redox Pay</strong></footer>
      </div>
    </div>
  </div>;
}