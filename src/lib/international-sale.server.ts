import type { SupabaseClient } from '@supabase/supabase-js';
import { canEmailPurchase, EMAIL_LAUNCH_DATE } from './email-policy';
import { internationalSaleNotice } from './international-sale';

/** Called only after provider verification, with a persisted LIVE ledger reference. */
export async function notifyInternationalSale(client: SupabaseClient, reference: string) {
  const { data: payment, error } = await client.from('international_payments').select('*').eq('reference', reference).maybeSingle();
  if (error) throw new Error('Payment notification lookup failed');
  if (!payment || !canEmailPurchase(payment) || Date.parse(payment.created_at) < Date.parse(EMAIL_LAUNCH_DATE)) return;
  const { data: product } = await client.from('products').select('name').eq('id', payment.product_id).eq('user_id', payment.user_id).maybeSingle();
  const notice = internationalSaleNotice(payment, product?.name ?? 'Purchase');
  // A unique event index gates concurrent webhook/poll notifications.
  const { error: insertError } = await client.from('notifications').insert({
    user_id: payment.user_id, type: 'international_sale', title: notice.title, message: notice.body,
    data: { international_reference: reference, transaction_id: payment.id, product_id: payment.product_id, currency: payment.currency, amount: Number(payment.amount_minor) / 100, provider: payment.provider },
  });
  if (insertError?.code === '23505') return;
  if (insertError) throw new Error('Sale notification could not be recorded');
  const { sendPushToUser } = await import('./push.functions');
  const result = await sendPushToUser(client, payment.user_id, notice.title, notice.body, '/dashboard/transactions');
  await client.from('notifications').update({ data: { international_reference: reference, transaction_id: payment.id, product_id: payment.product_id, currency: payment.currency, amount: Number(payment.amount_minor) / 100, provider: payment.provider, push_sent: result.ok, push_reason: result.reason ?? null } }).eq('user_id', payment.user_id).eq('type', 'international_sale').contains('data', { international_reference: reference });
}