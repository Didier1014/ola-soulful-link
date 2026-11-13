import type { SupabaseClient } from '@supabase/supabase-js';
import { sendAppEmail, getUserEmail } from './email.server';
import { canEmailPurchase, DIGITAL_EMAIL_LINK_SECONDS, safeDeliveryUrl, EMAIL_LAUNCH_DATE } from './email-policy';
import { resolveCheckoutLanguage } from './checkout-language';

/** Only persisted, provider-confirmed LIVE payments may trigger delivery. */
export async function sendPurchaseEmails(client: SupabaseClient, ledger: 'national' | 'international', id: string) {
  const table = ledger === 'national' ? 'transactions' : 'international_payments';
  const { data: payment, error } = await client.from(table).select('*').eq(ledger === 'national' ? 'id' : 'reference', id).maybeSingle();
  if (error || !payment || !canEmailPurchase(payment)) return { ok: false, reason: 'payment_not_paid' };
  // Safety-net reads of historical sales must not trigger a retrospective mailing.
  if (!payment.created_at || Date.parse(payment.created_at) < Date.parse(EMAIL_LAUNCH_DATE)) return { ok: false, reason: 'historical_payment' };
  const { data: product } = await client.from('products').select('id,user_id,name,config,product_type,digital_file_path,delivery_url,thank_you_url').eq('id', payment.product_id).eq('user_id', payment.user_id).maybeSingle();
  const { data: profile } = await client.from('profiles').select('support_phone,support_phone2').eq('id', payment.user_id).maybeSingle();
  const currency = ledger === 'national' ? 'MZN' : payment.currency;
  const amount = ledger === 'national' ? Number(payment.amount_mzn) : Number(payment.amount_minor) / 100;
  const formatted = new Intl.NumberFormat('pt-MZ', { style: 'currency', currency }).format(amount);
  let deliveryUrl = safeDeliveryUrl(product?.delivery_url) ?? safeDeliveryUrl(product?.thank_you_url);
  let digital = false;
  if (product?.product_type === 'digital' && product.digital_file_path) {
    const { data: signed } = await client.storage.from('product-digital').createSignedUrl(product.digital_file_path, DIGITAL_EMAIL_LINK_SECONDS, { download: true });
    deliveryUrl = safeDeliveryUrl(signed?.signedUrl);
    digital = Boolean(deliveryUrl);
  }
  const result = payment.customer_email ? await sendAppEmail(client, {
    templateName: 'product-delivery', recipientEmail: payment.customer_email,
    idempotencyKey: `product-delivery-${ledger}-${id}`,
    templateData: { customerName: payment.customer_name ?? 'Cliente', productName: product?.name ?? 'Pagamento', amount: formatted, reference: id, deliveryUrl, digital, support: [profile?.support_phone, profile?.support_phone2].filter(Boolean).join(' / '), language: resolveCheckoutLanguage((product?.config as { checkout?: unknown } | null)?.checkout) },
  }) : { ok: false, reason: 'no_recipient' };
  if (ledger === 'international') {
    const email = await getUserEmail(client, payment.user_id);
    if (email) await sendAppEmail(client, { templateName: 'sale-confirmation', recipientEmail: email, idempotencyKey: `sale-email-international-${id}`, templateData: { productName: product?.name, customerName: payment.customer_name, amount: formatted, international: true, transactionId: id, date: payment.paid_at } });
  }
  return result;
}