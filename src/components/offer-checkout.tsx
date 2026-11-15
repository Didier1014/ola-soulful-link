import { useEffect, useState, type ReactNode } from "react";
import { Lock, ShieldCheck, Wallet, ChevronRight, Mail, Timer, Clock } from "lucide-react";
import { offerTimerMinutes, offerSecondsLeft } from "@/lib/offer-timer";
import type { CheckoutLanguage, CheckoutCopy } from "@/lib/checkout-language";

const copy = {
  en: { offer: "Exclusive offer", subtitle: "Selected for you", order: "Your order", payment: "Complete your purchase" },
  pt: { offer: "Oferta exclusiva", subtitle: "Selecionada para si", order: "A sua compra", payment: "Finalize a sua compra" },
  es: { offer: "Oferta exclusiva", subtitle: "Seleccionada para ti", order: "Tu pedido", payment: "Completa tu compra" },
  fr: { offer: "Offre exclusive", subtitle: "Sélectionnée pour vous", order: "Votre commande", payment: "Finalisez votre achat" },
};

export function OfferCheckout({ product, price, language, t, children, variant = "offer" }: {
  variant?: "offer" | "escale";
  product: { id?: string; name: string; description?: string | null; cover_url?: string | null; config?: { personalizacao?: unknown } };
  price: string; language: CheckoutLanguage; t: CheckoutCopy; children: ReactNode;
}) {
  const text = copy[language];
  const minutes = offerTimerMinutes(product.config?.personalizacao);
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    if (!minutes) return;
    const key = `rdx-offer-deadline:${product.id ?? product.name}`;
    let deadline = Date.now() + minutes * 60000;
    try {
      const stored = Number(sessionStorage.getItem(key));
      if (stored > 0 && Number.isFinite(stored)) deadline = stored;
      else sessionStorage.setItem(key, String(deadline));
    } catch { /* Storage may be unavailable; keep a stable in-memory deadline. */ }
    const tick = () => setSeconds(offerSecondsLeft(deadline, Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [minutes, product.id, product.name]);
  const timerValue = seconds ?? (minutes ?? 0) * 60;
  const clock = [Math.floor(timerValue / 60), timerValue % 60].map(value => String(value).padStart(2, "0")).join(":");
  if (variant === "escale") {
    const e = ({ en: { ends: "Special Offer Ends In:", sub: "Subtotal:", fees: "Fees:", free: "Free", total: "Total:", secure: "100% secure purchase", instant: "Immediate delivery" }, pt: { ends: "Oferta especial termina em:", sub: "Subtotal:", fees: "Taxas:", free: "Grátis", total: "Total:", secure: "Compra 100% segura", instant: "Entrega imediata" }, es: { ends: "La oferta termina en:", sub: "Subtotal:", fees: "Tarifas:", free: "Gratis", total: "Total:", secure: "Compra 100% segura", instant: "Entrega inmediata" }, fr: { ends: "L'offre se termine dans :", sub: "Sous-total :", fees: "Frais :", free: "Gratuit", total: "Total :", secure: "Achat 100% sécurisé", instant: "Livraison immédiate" } })[language];
    return <div lang={language} className="offer-checkout escale-checkout min-h-screen">
      {product.cover_url && <div className="mx-auto max-w-[640px]"><img src={product.cover_url} alt={product.name} className="w-full object-cover" /></div>}
      {minutes && <div className="escale-countdown sticky top-0 z-20 flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold"><Clock className="size-5" />{e.ends} <span className="font-bold tabular-nums">{clock}</span></div>}
      <main className="mx-auto max-w-[640px] px-3 py-4 space-y-6">
        <section className="escale-card rounded-2xl p-4 sm:p-5">
          <div className="flex gap-4">{product.cover_url && <img src={product.cover_url} alt="" className="size-20 sm:size-24 shrink-0 rounded-lg object-cover" />}<div className="min-w-0"><h1 className="text-lg sm:text-xl font-bold leading-snug line-clamp-2">{product.name}</h1><p className="escale-green mt-1 text-xl sm:text-2xl font-bold">{price}</p></div></div>
          <div className="escale-line mt-4 pt-3 space-y-1 text-sm"><div className="flex justify-between"><span className="escale-muted">{e.sub}</span><span>{price}</span></div><div className="flex justify-between"><span className="escale-muted">{e.fees}</span><span className="escale-green font-semibold">{e.free}</span></div></div>
          <div className="escale-line mt-3 pt-3 flex justify-between text-lg font-bold"><span>{e.total}</span><span className="escale-green">{price}</span></div>
        </section>
        {children}
        <div className="escale-muted flex items-center justify-center gap-4 text-sm"><span className="flex items-center gap-1"><ShieldCheck className="escale-green size-4" />{e.secure}</span><span className="flex items-center gap-1"><Lock className="escale-green size-4" />{e.instant}</span></div>
      </main>
      <footer className="escale-muted flex items-center justify-center gap-2 pb-8 text-xs"><Lock className="size-3.5" />{t.checkoutBy} <strong>Redox Pay</strong></footer>
    </div>;
  }
  return <div lang={language} className="offer-checkout min-h-screen">
    {minutes && <div className="offer-countdown flex items-center justify-center gap-2 px-4 text-center"><Timer className="size-4 shrink-0" /><span className="font-mono text-sm font-bold tabular-nums">{[Math.floor(timerValue / 3600), Math.floor(timerValue / 60) % 60, timerValue % 60].map(value => String(value).padStart(2, '0')).join(':')}</span><span className="text-xs sm:text-sm">{timerValue > 0 ? ({ en: 'Hurry, time is running out!', pt: 'O tempo está a acabar!', es: '¡El tiempo se acaba!', fr: 'Le temps presse !' })[language] : ({ en: 'Offer timer ended', pt: 'Temporizador terminado', es: 'Temporizador terminado', fr: 'Compte à rebours terminé' })[language]}</span></div>}
    <header className="offer-brand">
      <div className="offer-header-inner mx-auto flex max-w-[750px] items-center justify-between gap-4 px-4 sm:px-8">
        <span className="offer-header-title min-w-0 truncate rounded-md px-3 py-2 font-bold">{product.name}</span>
        <span className="offer-header-price flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-bold"><Wallet className="size-5" />{price}</span>
      </div>
    </header>
    <main className="mx-auto max-w-[750px]">
      {product.cover_url && <div className="offer-photo aspect-[4/3] w-full"><img src={product.cover_url} alt={product.name} className="h-full w-full object-contain" /></div>}
      <div className="offer-body px-4 py-4 sm:px-8 sm:py-8">
        <nav aria-label="Breadcrumb" className="offer-breadcrumb mb-4 text-sm"><a href="/">Redox Pay</a><ChevronRight className="mx-1 inline size-3.5" /><span>{product.name}</span><ChevronRight className="mx-1 inline size-3.5" /><span>Checkout</span></nav>
        <section className="offer-order rounded-lg p-5 sm:p-8 mb-4 sm:mb-8">
        <div className="flex justify-between items-center gap-3"><p className="offer-kicker text-sm font-bold uppercase">{text.order}</p><span className="offer-label rounded-md px-2 py-1 text-xs font-bold">CHECKOUT</span></div>
        <h1 className="mt-2 text-[22px] sm:text-4xl font-extrabold leading-tight break-words">{product.name}</h1>
        {product.description && <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{product.description}</p>}
        <p className="offer-price mt-3 text-[32px] sm:text-5xl font-extrabold">{price}</p>
        <p className="offer-kicker mt-3 text-base sm:text-xl leading-relaxed">{language === "en" ? "Complete the form below to finalize your purchase." : text.payment}</p>
        </section>
        {children}
        <section className="offer-panel offer-protection mt-4 sm:mt-8 rounded-lg p-5 sm:p-8 flex items-start gap-3"><span className="offer-protection-icon flex size-10 shrink-0 items-center justify-center rounded-full"><ShieldCheck className="size-6 text-success" /></span><div><h2 className="text-base sm:text-lg font-bold">{t.protected}</h2><p className="mt-2 text-sm text-muted-foreground">{t.cardSafety} Paystack.</p></div></section>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">{[{ Icon: ShieldCheck, label: t.secure }, { Icon: Lock, label: t.encrypted }, { Icon: Mail, label: t.email }, { Icon: ShieldCheck, label: "Paystack" }].map(({ Icon, label }) => <div key={label} className="offer-panel rounded-lg px-4 py-3 flex items-center gap-2"><Icon className="size-5 text-primary" /><span className="text-muted-foreground">{label}</span></div>)}</div>
      </div>
    </main>
    <footer className="offer-breadcrumb flex items-center justify-center gap-2 pb-8 text-xs"><Lock className="size-3.5" />{t.checkoutBy} <strong>Redox Pay</strong></footer>
  </div>;
}