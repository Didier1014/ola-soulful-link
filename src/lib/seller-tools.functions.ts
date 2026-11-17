import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { zarRequestTotals } from './zar-requests';

export const listCheckoutCustomers = createServerFn({method:'GET'})
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({currency:z.enum(['ZAR','USD','EUR']).default('ZAR'),page:z.number().int().min(0).default(0)}).parse(v))
  .handler(async ({context,data}) => {
    const {data: rows,error,count} = await context.supabase.from('international_payments')
      .select('id,reference,customer_name,customer_email,customer_phone,status,currency,amount_minor,created_at,products(name)',{count:'exact'})
      .eq('user_id',context.userId).eq('currency',data.currency).order('created_at',{ascending:false}).range(data.page*50,data.page*50+49);
    if(error) throw new Error(error.message);
    return {rows:rows??[],count:count??0};
  });

export const getZarRequests = createServerFn({method:'GET'})
  .middleware([requireSupabaseAuth])
  .inputValidator((v:unknown) => z.object({admin:z.boolean().default(false)}).parse(v))
  .handler(async ({context,data}) => {
    if(data.admin){
      const {data:allowed,error} = await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
      if(error || !allowed) throw new Error('Acesso restrito');
      const {data:rows,error:readError} = await context.supabase.from('zar_withdrawal_requests').select('*').order('created_at',{ascending:false}).limit(200);
      if(readError) throw new Error(readError.message);
      return {rows:rows??[],sales:0,reserved:0,requestable:0};
    }
    // Read every relevant ledger row, not a dashboard's truncated list.
    const payments: Array<{status:string;amount_minor:number;fee_minor:number}> = [];
    const requests: Array<{status:string;amount_minor:number}> = [];
    for(let from=0;;from+=1000){
      const {data:rows,error}=await context.supabase.from('international_payments').select('status,amount_minor,fee_minor').eq('user_id',context.userId).eq('currency','ZAR').eq('status','paid').range(from,from+999);
      if(error) throw new Error(error.message);
      payments.push(...rows??[]); if((rows??[]).length<1000) break;
    }
    for(let from=0;;from+=1000){
      const {data:rows,error}=await context.supabase.from('zar_withdrawal_requests').select('status,amount_minor').eq('user_id',context.userId).range(from,from+999);
      if(error) throw new Error(error.message);
      requests.push(...rows??[]); if((rows??[]).length<1000) break;
    }
    const {data:rows,error} = await context.supabase.from('zar_withdrawal_requests').select('*').eq('user_id',context.userId).order('created_at',{ascending:false}).limit(200);
    if(error) throw new Error(error.message);
    return {rows:rows??[],...zarRequestTotals(payments,requests)};
  });

export const requestZarWithdrawal = createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({amount_minor:z.number().int().positive().max(100000000),destination:z.string().trim().min(5).max(500)}).parse(v))
  .handler(async ({context,data})=>{
    const {data:id,error}=await context.supabase.rpc('request_zar_withdrawal',{p_amount_minor:data.amount_minor,p_destination:data.destination});
    if(error) throw new Error(error.message);
    return {id};
  });

export const decideZarWithdrawal = createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>z.object({id:z.string().uuid(),status:z.enum(['paid','rejected']),reference:z.string().trim().max(200).default(''),note:z.string().trim().max(500).default('')}).parse(v))
  .handler(async ({context,data})=>{
    const {error}=await context.supabase.rpc('decide_zar_withdrawal',{p_id:data.id,p_status:data.status,p_reference:data.reference,p_note:data.note});
    if(error) throw new Error(error.message);
    return {ok:true};
  });

const metaScope = z.object({product_id:z.string().uuid().optional()});
async function checkProductOwner(client: Parameters<typeof zarRequestTotals>[0] | any, userId:string, productId?:string) {
  if(!productId) return;
  const {data,error}=await client.from('products').select('id').eq('id',productId).eq('user_id',userId).maybeSingle();
  if(error || !data) throw new Error('Produto não encontrado');
}

export const getSellerMetaSettings = createServerFn({method:'GET'})
  .middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>metaScope.parse(v))
  .handler(async ({context,data})=>{
    await checkProductOwner(context.supabase,context.userId,data.product_id);
    const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
    const {data:row,error}=await supabaseAdmin.from('seller_meta_settings').select('pixel_id,updated_at').eq('user_id',context.userId).eq('scope_key',data.product_id??'account').maybeSingle();
    if(error) throw new Error('Não foi possível consultar a configuração Meta');
    return {pixel_id:row?.pixel_id??'',configured:!!row,updated_at:row?.updated_at??null,sync_enabled:false};
  });

export const saveSellerMetaSettings = createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>metaScope.extend({pixel_id:z.string().trim().regex(/^\d{5,30}$/,'Pixel ID inválido'),token:z.string().trim().min(20).max(4000)}).parse(v))
  .handler(async ({context,data})=>{
    await checkProductOwner(context.supabase,context.userId,data.product_id);
    const raw=process.env['SELLER_META_TOKEN_ENCRYPTION_KEY'];
    if(!raw) throw new Error('Armazenamento seguro indisponível');
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
    const key=await crypto.subtle.importKey('raw',digest,'AES-GCM',false,['encrypt']);
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(data.token));
    const token_ciphertext=JSON.stringify({iv:Array.from(iv),data:Array.from(new Uint8Array(encrypted))});
    const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
    const {error}=await supabaseAdmin.from('seller_meta_settings').upsert({user_id:context.userId,scope_key:data.product_id??'account',pixel_id:data.pixel_id,token_ciphertext,updated_at:new Date().toISOString()},{onConflict:'user_id,scope_key'});
    if(error) throw new Error('Não foi possível guardar a configuração Meta');
    return {ok:true};
  });

export const removeSellerMetaSettings = createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>metaScope.parse(v))
  .handler(async ({context,data})=>{
    await checkProductOwner(context.supabase,context.userId,data.product_id);
    const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
    const {error}=await supabaseAdmin.from('seller_meta_settings').delete().eq('user_id',context.userId).eq('scope_key',data.product_id??'account');
    if(error) throw new Error('Não foi possível remover a configuração Meta');
    return {ok:true};
  });