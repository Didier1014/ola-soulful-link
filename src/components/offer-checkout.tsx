import type { ReactNode } from "react";
import { Lock, ShieldCheck, Wallet, ChevronRight, Mail } from "lucide-react";
import type { CheckoutLanguage, CheckoutCopy } from "@/lib/checkout-language";

const copy = {
  en: { offer: "Exclusive offer", subtitle: "Selected for you", order: "Your order", payment: "Complete your purchase" },
  pt: { offer: "Oferta exclusiva", subtitle: "Selecionada para si", order: "A sua compra", payment: "Finalize a sua compra" },
  es: { offer: "Oferta exclusiva", subtitle: "Seleccionada para ti", order: "Tu pedido", payment: "Completa tu compra" },
  fr: { offer: "Offre exclusive", subtitle: "Sélectionnée pour vous", order: "Votre commande", payment: "Finalisez votre achat" },
};

export function OfferCheckout({ product, price, language, t, children }: {
  product: { name: string; description?: string | null; cover_url?: string | null };
  price: string; language: CheckoutLanguage; t: CheckoutCopy; children: ReactNode;
}) {
  const text = copy[language];
  return <div lang={language} className="offer-checkout min-h-screen">
    <header className="offer-brand">
      <div className="mx-auto flex max-w-[750px] items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <span className="offer-header-title min-w-0 truncate rounded-md px-3 py-2 font-bold">{product.name}</span>
        <span className="offer-header-price flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-bold"><Wallet className="size-5" />{price}</span>
      </div>
    </header>
    <main className="mx-auto max-w-[750px]">
      {product.cover_url && <div className="offer-photo aspect-[4/3] w-full"><img src={product.cover_url} alt={product.name} className="h-full w-full object-contain" /></div>}
      <div className="offer-body px-4 py-5 sm:px-8 sm:py-8">
        <nav aria-label="Breadcrumb" className="offer-breadcrumb mb-4 flex items-center gap-2 text-xs sm:text-sm"><a href="/">Redox Pay</a><ChevronRight className="size-4 shrink-0" /><span className="truncate">{product.name}</span><ChevronRight className="size-4 shrink-0" /><span>Checkout</span></nav>
        <section className="offer-order rounded-lg p-5 sm:p-8 mb-4 sm:mb-8">
        <div className="flex justify-between items-center gap-3"><p className="offer-kicker text-sm font-bold uppercase">{text.order}</p><span className="offer-label rounded-md px-2 py-1 text-xs font-bold">CHECKOUT</span></div>
        <h1 className="mt-2 text-2xl sm:text-4xl font-extrabold leading-tight break-words">{product.name}</h1>
        {product.description && <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{product.description}</p>}
        <p className="offer-price mt-3 text-4xl sm:text-5xl font-extrabold">{price}</p>
        <p className="offer-kicker mt-3 text-base sm:text-xl leading-relaxed">{language === "en" ? "Complete the form below to finalize your purchase." : text.payment}</p>
        </section>
        {children}
        <section className="offer-panel mt-4 sm:mt-8 rounded-lg p-5 sm:p-8 flex items-start gap-4"><ShieldCheck className="size-8 shrink-0 text-success" /><div><h2 className="text-lg font-bold">{t.protected}</h2><p className="mt-2 text-sm text-muted-foreground">{t.cardSafety} Paystack.</p></div></section>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">{[{ Icon: ShieldCheck, label: t.secure }, { Icon: Lock, label: t.encrypted }, { Icon: Mail, label: t.email }, { Icon: ShieldCheck, label: "Paystack" }].map(({ Icon, label }) => <div key={label} className="offer-panel rounded-lg px-4 py-3 flex items-center gap-2"><Icon className="size-5 text-primary" /><span className="text-muted-foreground">{label}</span></div>)}</div>
      </div>
    </main>
    <footer className="offer-breadcrumb flex items-center justify-center gap-2 pb-8 text-xs"><Lock className="size-3.5" />{t.checkoutBy} <strong>Redox Pay</strong></footer>
  </div>;
}