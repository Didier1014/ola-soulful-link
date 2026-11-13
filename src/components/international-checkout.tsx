import { useCheckoutLanguage } from "@/hooks/use-checkout-language";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Lock, ShieldCheck, Loader2, ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initializeInternationalCheckout } from "@/lib/international-checkout.functions";
import { formatProductPrice } from "@/lib/checkout-currency";
import { PAYSTACK_PUBLIC_KEY } from "@/lib/paystack-config";
import { useCheckoutOperation } from "@/hooks/use-checkout-operation";
import { OfferCheckout } from "@/components/offer-checkout";
import { resolveCheckoutStyle } from "@/lib/checkout-style";
import { checkoutLanguageConfig } from "@/lib/checkout-language";

type Product = { id: string; slug?: string; name: string; description?: string | null; price_mzn: number; price_amount?: number | null; currency?: string; checkout_provider?: string; cover_url?: string | null; config?: { checkout?: { language?: string; style?: string } }; visitor_country?: string | null };

async function openPaystack(accessCode: string, onSuccess: () => void, onCancel: () => void, errorMessage: string) {
  const host = window as unknown as { PaystackPop?: new () => { resumeTransaction: (code: string, options: { onSuccess: () => void; onCancel: () => void; onError: () => void }) => void } };
  if (!host.PaystackPop) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v2/inline.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(errorMessage));
      document.head.appendChild(script);
    });
  }
  if (!host.PaystackPop) throw new Error(errorMessage);
  new host.PaystackPop().resumeTransaction(accessCode, { onSuccess, onCancel, onError: onCancel });
}

export function InternationalCheckout({ product }: { product: Product }) {
  const { language, copy: t } = useCheckoutLanguage(checkoutLanguageConfig(product.config?.checkout, product.currency), product.visitor_country);
  const initialize = useServerFn(initializeInternationalCheckout);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resume, setResume] = useState<{ access_code: string; authorization_url: string } | null>(null);
  const stripe = product.checkout_provider === "stripe";
  const price = formatProductPrice(product);
  const offerPrice = product.currency === "ZAR" ? `R ${Number(product.price_amount).toFixed(2)}` : price;
  const operation = useCheckoutOperation("product", product.slug ?? "", !!product.slug, name, email, true);

  async function pay() {
    setBusy(true); setError("");
    try {
      const tracking = await operation.internationalAttempt();
      const result = await initialize({ data: { product_id: product.id, name, email, phone: phone || undefined, ...tracking } });
      sessionStorage.setItem(`rdx-paystack:${result.reference}`, result.capability);
      setResume(result);
      await openPaystack(result.access_code, () => { window.location.assign(`/international-return?reference=${encodeURIComponent(result.reference)}`); }, () => { setBusy(false); setError(t.interrupted); }, t.startError);
    } catch (e) {
      operation.error();
      setError(t.startError);
      setBusy(false);
    }
  }

  if (resolveCheckoutStyle(product.config?.checkout) === "offer") return <OfferCheckout product={product} price={offerPrice} language={language} t={t}>
    <form onSubmit={event => { event.preventDefault(); void pay(); }} className="space-y-4 sm:space-y-8">
      <section className="offer-panel offer-information rounded-lg p-5 sm:p-8 space-y-5">
      <h2 className="border-l-4 border-primary pl-3 text-lg sm:text-xl font-bold">{language === "en" ? "Your Information" : t.details}</h2>
      <div className="space-y-2"><Label htmlFor="international-name">{t.name}</Label><Input id="international-name" autoComplete="name" placeholder={language === "en" ? "John Doe" : t.yourName} required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="international-email">{language === "en" ? "Email Address" : t.email}</Label><Input id="international-email" type="email" autoComplete="email" placeholder="john@example.com" required maxLength={160} value={email} onChange={event => setEmail(event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="international-phone">{language === "en" ? "Phone Number" : t.number}</Label><div className="offer-phone flex border border-border overflow-hidden"><span className="bg-secondary px-3 flex gap-2 items-center text-muted-foreground text-base"><Phone className="size-4" />+27</span><Input id="international-phone" type="tel" autoComplete="tel-national" placeholder="82 123 4567" maxLength={15} value={phone} onChange={event => setPhone(event.target.value)} className="border-0 rounded-none min-w-0 flex-1" /></div></div>
      </section>
      <section className="offer-panel offer-summary rounded-lg p-5 sm:p-8 space-y-5">
      <h2 className="text-base sm:text-xl font-bold">{language === "en" ? "Order Summary" : t.summary}</h2>
      <div className="flex justify-between gap-4 text-base"><span className="text-muted-foreground truncate min-w-0">{product.name}</span><span className="shrink-0">{offerPrice}</span></div>
      <div className="flex justify-between gap-4 border-t border-border pt-5 text-xl font-bold"><span>{language === "en" ? "Total" : t.total}</span><span>{offerPrice}</span></div>
      {stripe && <p role="status" className="text-sm text-muted-foreground">{t.stripe}</p>}
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={busy || stripe} className="offer-submit w-full h-auto py-4 font-bold whitespace-normal gap-2">{busy ? <Loader2 className="size-5 animate-spin" /> : <CreditCard className="size-5" />}{busy ? t.processing : `${t.pay.toUpperCase()} ${offerPrice}`}</Button>
      {busy && <p role="status" className="text-center text-sm">{t.processing}</p>}
      {resume && !busy && <Button type="button" variant="outline" className="w-full whitespace-normal h-auto py-3" onClick={() => window.location.assign(resume.authorization_url)}>{t.continue}<ArrowRight className="size-4" /></Button>}
      <div className="flex justify-center gap-4 text-muted-foreground text-xs"><span className="flex items-center gap-1"><Lock className="size-4" />SSL</span><span className="flex items-center gap-1"><CreditCard className="size-4" />{t.card}</span></div>
      </section>
    </form>
  </OfferCheckout>;

  return <div lang={language} className="international-checkout min-h-screen bg-background text-foreground" data-paystack-public-key={stripe ? undefined : PAYSTACK_PUBLIC_KEY}>
    <div className="mx-auto max-w-[680px] px-5 sm:px-8 pb-10">
      <header className="flex items-center justify-between gap-4 pt-8 pb-14 sm:pb-20">
        <a href="/" className="text-primary text-2xl font-extrabold leading-tight">REDOX<span className="block text-sm font-semibold">PAY</span></a>
        <span className="flex items-center gap-2 text-muted-foreground text-sm"><Lock className="size-4" />{t.secure}</span>
      </header>
      <div className="h-1 w-16 bg-primary rounded-full mb-8" />
      <section className="pb-8 border-b border-border">
        <div className="flex justify-between items-center gap-4 mb-7"><h1 className="text-lg font-semibold">{t.summary}</h1><span className="border border-border rounded-lg px-4 py-2 text-sm">{product.currency}</span></div>
        <div className="flex gap-4 items-center mb-6">{product.cover_url && <img src={product.cover_url} alt={product.name} className="size-16 object-cover rounded-lg" />}<h2 className="text-2xl sm:text-3xl font-bold break-words min-w-0">{product.name}</h2></div>
        <p className="text-4xl sm:text-5xl font-bold break-words">{price}<span className="text-base font-medium text-muted-foreground ml-3">{product.currency}</span></p>
      </section>
      <form onSubmit={event => { event.preventDefault(); void pay(); }} className="pt-7 space-y-6">
        <h2 className="flex items-center gap-3 font-semibold text-xl"><span className="international-step">1</span>{t.details}</h2>
        <div className="space-y-2"><Label htmlFor="international-name">{t.name}</Label><Input id="international-name" autoComplete="name" placeholder={t.yourName} required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="international-email">{t.email}</Label><Input id="international-email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required maxLength={160} value={email} onChange={event => setEmail(event.target.value)} /></div>
        <div className="flex justify-between items-center gap-2 pt-2"><h2 className="flex items-center gap-3 font-semibold text-xl"><span className="international-step">2</span>{t.payment}</h2><span className="text-muted-foreground text-sm flex gap-2 items-center"><CreditCard className="size-4" />{t.card}</span></div>
        <div className="flex items-center gap-3 text-muted-foreground py-4 border-y border-border"><ShieldCheck className="size-6 text-success shrink-0" /><p className="text-sm">{t.cardSafety} {stripe ? "Stripe" : "Paystack"}.</p></div>
        {stripe && <p role="status" className="text-sm text-muted-foreground">{t.stripe}</p>}
        {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
        <Button type="submit" disabled={busy || stripe} className="w-full h-auto min-h-16 py-4 text-lg font-bold rounded-lg whitespace-normal gap-2">{busy ? <Loader2 className="size-5 animate-spin shrink-0" /> : <Lock className="size-5 shrink-0" />}{busy ? t.processing : `${t.finish} · ${price}`}</Button>
        {resume && !busy && <Button type="button" variant="outline" className="w-full" onClick={() => window.location.assign(resume.authorization_url)}>{t.continue}<ArrowRight className="size-4" /></Button>}
        <p className="text-center text-sm text-muted-foreground">{t.charge} {product.currency} · {t.exchange}</p>
      </form>
      <section className="mt-7 border border-border rounded-lg px-4 py-6 text-center">
        <div className="flex justify-center gap-4 items-center mb-6"><span className="international-card-brand font-bold italic">VISA</span><span className="international-card-brand font-semibold">Mastercard</span></div>
        <div className="grid grid-cols-2 gap-4 text-muted-foreground text-sm"><div><ShieldCheck className="size-5 text-success mx-auto mb-2" />{t.secure}</div><div><Lock className="size-5 text-primary mx-auto mb-2" />{t.encrypted}</div></div>
      </section>
      <footer className="flex justify-center items-center gap-2 text-muted-foreground text-sm pt-8"><Lock className="size-4" />{t.checkoutBy} <strong className="text-foreground">Redox Pay</strong></footer>
    </div>
  </div>;
}