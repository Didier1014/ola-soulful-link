import type { ReactNode } from "react";
import { Check, Lock, ShieldCheck } from "lucide-react";
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
  return <div lang={language} className="offer-checkout min-h-screen px-4 py-6 sm:py-10">
    <header className="offer-brand mx-auto flex max-w-[480px] items-center justify-between gap-3 pb-5">
      <a href="/" className="font-bold text-base">REDOX PAY</a>
      <span className="flex items-center gap-1.5 text-xs"><Lock className="size-3.5" />{t.secure}</span>
    </header>
    <main className="offer-sheet mx-auto max-w-[480px] overflow-hidden rounded-lg">
      <header className="offer-heading px-6 py-8 text-center">
        <span className="offer-label inline-block rounded-full px-4 py-1.5 text-xs font-bold">REDOX PAY</span>
        <h1 className="mt-4 text-3xl font-extrabold">{text.offer}</h1>
        <p className="mt-2 text-sm">{text.subtitle}</p>
      </header>
      <div className="offer-body px-5 py-6 sm:px-8">
        {product.cover_url && <div className="offer-photo mb-5 aspect-[4/3] w-full"><img src={product.cover_url} alt={product.name} className="h-full w-full object-contain" /></div>}
        <p className="offer-kicker text-xs font-bold uppercase">{text.order}</p>
        <h2 className="mt-2 text-xl font-bold leading-snug break-words">{product.name}</h2>
        {product.description && <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{product.description}</p>}
        <div className="offer-price mt-5 flex flex-wrap items-center justify-between gap-3 border-y py-4"><span className="text-sm">{t.total}</span><strong className="text-3xl font-extrabold">{price}</strong></div>
        <div className="offer-trust flex items-center gap-2 py-4 text-sm"><Check className="size-4 shrink-0" />{t.secure}<span aria-hidden="true">·</span><ShieldCheck className="size-4 shrink-0" />{t.protected}</div>
        <h2 className="mb-5 text-lg font-bold">{text.payment}</h2>
        {children}
      </div>
    </main>
    <footer className="offer-brand flex items-center justify-center gap-2 pt-6 text-xs"><Lock className="size-3.5" />{t.checkoutBy} <strong>Redox Pay</strong></footer>
  </div>;
}