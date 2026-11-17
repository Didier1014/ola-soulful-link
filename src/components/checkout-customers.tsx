import { useState } from 'react';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { listCheckoutCustomers } from '@/lib/seller-tools.functions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Search, Users } from 'lucide-react';

export const customersQuery=(currency:'ZAR'|'USD'|'EUR'='ZAR',page=0)=>queryOptions({queryKey:['checkout-customers',currency,page],queryFn:()=>listCheckoutCustomers({data:{currency,page}})});
const statuses:Record<string,string>={pending:'Pendente',paid:'Pago',failed:'Falhou',test_paid:'Teste',abandoned:'Abandonado'};
export function CheckoutCustomers(){
  const [currency,setCurrency]=useState<'ZAR'|'USD'|'EUR'>('ZAR');
  const [page,setPage]=useState(0);
  const [search,setSearch]=useState('');
  const {data}=useSuspenseQuery(customersQuery(currency,page));
  const rows=data.rows.filter(r=>[r.customer_name,r.customer_email,r.customer_phone,r.products?.name].some(v=>v?.toLowerCase().includes(search.toLowerCase())));
  return <section className="space-y-5">
    <header className="flex flex-wrap gap-4 justify-between"><h2 className="text-xl font-semibold flex gap-2 items-center"><Users className="size-5 text-primary"/>Clientes · {data.count}</h2><Select value={currency} onValueChange={v=>{setCurrency(v as 'ZAR'|'USD'|'EUR');setPage(0);}}><SelectTrigger className="w-32" aria-label="Moeda dos clientes"><SelectValue/></SelectTrigger><SelectContent>{['ZAR','USD','EUR'].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></header>
    <div className="relative max-w-md"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input aria-label="Pesquisar clientes nesta página" className="pl-10" placeholder="Nome, email ou celular nesta página" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground">{['Cliente','Email','Celular','Produto','Valor','Pagamento','Data'].map(v=><th className="py-3 pr-4 font-normal" key={v}>{v}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-b border-border"><td className="py-4 pr-4">{r.customer_name||'—'}</td><td className="pr-4 break-all">{r.customer_email||'—'}</td><td className="pr-4 whitespace-nowrap">{r.customer_phone||'Não fornecido'}</td><td className="pr-4">{r.products?.name||'—'}</td><td className="pr-4 whitespace-nowrap">{(r.amount_minor/100).toFixed(2)} {r.currency}</td><td className={r.status==='paid'?'text-success':'text-muted-foreground'}>{statuses[r.status]??r.status}</td><td className="pl-4 whitespace-nowrap text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('pt-MZ')}</td></tr>)}</tbody></table></div>
    {!rows.length&&<p className="text-sm text-muted-foreground py-6">Nenhum cliente encontrado.</p>}
    <div className="flex gap-3 items-center justify-end"><Button variant="outline" size="icon" aria-label="Página anterior" disabled={!page} onClick={()=>setPage(page-1)}><ChevronLeft className="size-4"/></Button><span className="text-xs text-muted-foreground">{page+1} / {Math.max(1,Math.ceil(data.count/50))}</span><Button variant="outline" size="icon" aria-label="Página seguinte" disabled={(page+1)*50>=data.count} onClick={()=>setPage(page+1)}><ChevronRight className="size-4"/></Button></div>
    <p className="text-xs text-muted-foreground">Contactos fornecidos ao iniciar o pagamento · Apenas os seus clientes · Compras antigas podem não ter celular guardado.</p>
  </section>;
}