import { useState } from 'react';
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getZarRequests,requestZarWithdrawal,decideZarWithdrawal } from '@/lib/seller-tools.functions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import { Wallet,CheckCircle2,XCircle } from 'lucide-react';
import { toast } from 'sonner';

export const zarRequestsQuery=(admin=false)=>queryOptions({queryKey:['zar-requests',admin],queryFn:()=>getZarRequests({data:{admin}}),refetchInterval:30000});
const money=(n:number)=>`${(n/100).toFixed(2)} ZAR`;
export function ZarWithdrawals({admin=false}:{admin?:boolean}){
  const qc=useQueryClient();
  const {data}=useSuspenseQuery(zarRequestsQuery(admin));
  const [amount,setAmount]=useState('');
  const [destination,setDestination]=useState('');
  const [selected,setSelected]=useState<string|null>(null);
  const [reference,setReference]=useState('');
  const [note,setNote]=useState('');
  const request=useMutation({mutationFn:()=>requestZarWithdrawal({data:{amount_minor:Math.round(Number(amount)*100),destination}}),onSuccess:()=>{setAmount('');setDestination('');qc.invalidateQueries({queryKey:['zar-requests']});toast.success('Pedido ZAR enviado para análise');},onError:e=>toast.error(e.message)});
  const decide=useMutation({mutationFn:(status:'paid'|'rejected')=>{if(!selected)throw new Error('Selecione um pedido');return decideZarWithdrawal({data:{id:selected,status,reference,note}});},onSuccess:()=>{setSelected(null);setReference('');setNote('');qc.invalidateQueries({queryKey:['zar-requests']});toast.success('Pedido atualizado');},onError:e=>toast.error(e.message)});
  return <section className="space-y-6">
    <h1 className="text-2xl font-semibold flex gap-3 items-center"><Wallet className="size-6 text-primary"/>Saques ZAR · Manual</h1>
    {!admin&&<><div className="grid sm:grid-cols-3 gap-4">{[['Vendas líquidas LIVE',data.sales],['Solicitado / pago',data.reserved],['Limite para pedidos',data.requestable]].map(([label,value])=><article key={String(label)} className="border border-border rounded-lg bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-semibold">{money(Number(value))}</p></article>)}</div>
    <p role="status" className="text-sm text-muted-foreground">Este limite não é saldo confirmado da Paystack. O administrador deve conferir o split e os fundos recebidos antes de transferir em ZAR. Sem conversão para MT.</p>
    <form className="border-y border-border py-6 space-y-4 max-w-xl" onSubmit={e=>{e.preventDefault();request.mutate();}}><h2 className="font-semibold">Novo pedido</h2><div className="space-y-2"><Label htmlFor="zar-amount">Valor em ZAR</Label><Input id="zar-amount" type="number" min="0.01" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)}/></div><div className="space-y-2"><Label htmlFor="zar-destination">Titular, banco, conta e código da agência</Label><Input id="zar-destination" required minLength={5} maxLength={500} value={destination} onChange={e=>setDestination(e.target.value)}/></div><Button type="submit" disabled={request.isPending||!amount||Number(amount)<=0||Math.round(Number(amount)*100)>data.requestable}>{request.isPending?'A enviar…':'Solicitar saque ZAR'}</Button></form></>}
    <section><h2 className="font-semibold mb-4">Pedidos ZAR</h2><div className="divide-y divide-border">{data.rows.map(r=><article className="py-4 space-y-2" key={r.id}><div className="flex justify-between gap-3"><strong>{money(r.amount_minor)}</strong><span className={r.status==='paid'?'text-success':'text-muted-foreground'}>{r.status==='pending'?'Pendente':r.status==='paid'?'Pago':'Rejeitado'}</span></div><p className="text-sm break-words">{r.destination}</p>{admin&&<p className="text-xs text-muted-foreground">Vendedor: {r.user_id}</p>}<p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('pt-MZ')}{r.transfer_reference&&` · Transferência: ${r.transfer_reference}`}</p>{r.note&&<p className="text-sm text-muted-foreground">{r.note}</p>}{admin&&r.status==='pending'&&<Button variant="outline" onClick={()=>{setSelected(r.id);setReference('');setNote('');}}>Analisar pedido</Button>}</article>)}</div>{!data.rows.length&&<p className="text-muted-foreground text-sm py-6">Nenhum pedido ZAR.</p>}</section>
    <Dialog open={!!selected} onOpenChange={v=>{if(!v)setSelected(null);}}><DialogContent><DialogHeader><DialogTitle>Decisão do saque ZAR</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Confirme os fundos e realize a transferência fora da Redox antes de marcar como pago.</p><Label htmlFor="zar-ref">Referência / comprovativo da transferência</Label><Input id="zar-ref" value={reference} maxLength={200} onChange={e=>setReference(e.target.value)}/><Label htmlFor="zar-note">Observação</Label><Input id="zar-note" value={note} maxLength={500} onChange={e=>setNote(e.target.value)}/><div className="flex gap-3"><Button disabled={decide.isPending||reference.trim().length<3} onClick={()=>decide.mutate('paid')}><CheckCircle2 className="size-4"/>Confirmar pago</Button><Button variant="outline" disabled={decide.isPending} onClick={()=>decide.mutate('rejected')}><XCircle className="size-4"/>Rejeitar</Button></div></DialogContent></Dialog>
  </section>;
}