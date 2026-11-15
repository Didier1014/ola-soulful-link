import { useState } from "react";
import { ArrowDown } from "lucide-react";
import type { CheckoutLanguage } from "@/lib/checkout-language";

export type Bump = { id: string; name: string; description?: string | null; cover_url: string | null; price: number };

const labels = {
  en: { title: "Buy together", more: "See more", less: "See less" },
  pt: { title: "Compre junto", more: "Ver mais", less: "Ver menos" },
  es: { title: "Compra junto", more: "Ver más", less: "Ver menos" },
  fr: { title: "Achetez ensemble", more: "Voir plus", less: "Voir moins" },
};

export function BuyTogether({ bumps, selected, onToggle, format, language }: { bumps: Bump[]; selected: Record<string, boolean>; onToggle: (id: string, value: boolean) => void; format: (value: number) => string; language: CheckoutLanguage }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (!bumps.length) return null;
  const text = labels[language];
  return <section className="space-y-3" aria-label={text.title}>
    <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><span className="h-px flex-1 bg-border" />{text.title}<span className="h-px flex-1 bg-border" /></div>
    {bumps.map(b => <div key={b.id} className={`bump-card rounded-xl border-2 p-3 ${selected[b.id] ? "border-primary" : "border-border"}`}>
      <label className="flex cursor-pointer items-start gap-3">
        <span className="flex shrink-0 flex-col items-center gap-1"><ArrowDown className="size-5 text-destructive" strokeWidth={3} /><input type="checkbox" checked={!!selected[b.id]} onChange={e => onToggle(b.id, e.target.checked)} className="size-5 accent-[var(--primary)]" /></span>
        {b.cover_url && <img src={b.cover_url} alt="" className="size-14 shrink-0 rounded-md object-cover" />}
        <span className="min-w-0"><span className="block font-semibold leading-snug">{b.name}</span><span className="mt-1 block font-bold text-primary">{format(b.price)}</span></span>
      </label>
      {b.description && <div className="mt-2 text-sm text-muted-foreground"><p className={open[b.id] ? "whitespace-pre-line" : "line-clamp-2"}>{b.description}</p><button type="button" className="mt-1 text-xs font-medium text-primary" onClick={() => setOpen({ ...open, [b.id]: !open[b.id] })}>{open[b.id] ? text.less : text.more}</button></div>}
    </div>)}
  </section>;
}
