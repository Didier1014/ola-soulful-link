import { useState } from 'react';
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSellerMetaSettings, saveSellerMetaSettings, removeSellerMetaSettings } from '@/lib/seller-tools.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const sellerMetaQuery = (product_id?:string) => queryOptions({queryKey:['seller-meta',product_id??'account'],queryFn:()=>getSellerMetaSettings({data:{product_id}})});
export function SellerMetaSettings({productId}:{productId?:string}){
  const qc=useQueryClient();
  const {data}=useSuspenseQuery(sellerMetaQuery(productId));
  const [pixel,setPixel]=useState(data.pixel_id);
  const [token,setToken]=useState('');
  const mutation=useMutation({mutationFn:()=>saveSellerMetaSettings({data:{product_id:productId,pixel_id:pixel,token}}),onSuccess:()=>{setToken('');toast.success('Token Meta guardado com segurança');qc.invalidateQueries({queryKey:['seller-meta']});},onError:(e)=>toast.error(e.message)});
  const remove=useMutation({mutationFn:()=>removeSellerMetaSettings({data:{product_id:productId}}),onSuccess:()=>{setToken('');setPixel('');qc.invalidateQueries({queryKey:['seller-meta']});toast.success('Configuração removida');},onError:(e)=>toast.error(e.message)});
  return <section className="border-y border-border py-6 space-y-4">
    <h2 className="font-semibold flex gap-2 items-center"><ShieldCheck className="size-5 text-primary"/>Facebook · Pixel e API de Conversões</h2>
    <p role="status" className="text-sm text-muted-foreground">{data.configured?'Token guardado · sincronização ainda não ativada':'Sem token configurado'}</p>
    <div className="grid sm:grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="meta-account-pixel">Pixel ID</Label><Input id="meta-account-pixel" value={pixel} onChange={e=>setPixel(e.target.value)} inputMode="numeric"/></div><div className="space-y-2"><Label htmlFor="meta-account-token">Token de API do Facebook</Label><Input id="meta-account-token" type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder={data.configured?'Introduzir novo token':'Token da API de Conversões'}/></div></div>
    <p className="text-xs text-muted-foreground">Envio de eventos pendente de ligação autorizada à Meta e consentimento de publicidade dos clientes. Nenhum token é mostrado no checkout.</p>
    <div className="flex gap-3"><Button onClick={()=>mutation.mutate()} disabled={mutation.isPending||!pixel||!token}>{mutation.isPending?'A guardar…':'Guardar configuração Meta'}</Button>{data.configured&&<Button variant="outline" size="icon" aria-label="Remover configuração Meta" title="Remover configuração Meta" onClick={()=>remove.mutate()} disabled={remove.isPending}><Trash2 className="size-4"/></Button>}</div>
  </section>;
}