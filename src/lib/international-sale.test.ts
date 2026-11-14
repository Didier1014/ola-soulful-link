import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { internationalSaleNotice } from './international-sale';
import { notifyInternationalSale } from './international-sale.server';
import type { SupabaseClient } from '@supabase/supabase-js';
for (const currency of ['ZAR', 'USD', 'EUR']) {
  test(`international notifications preserve ${currency} without conversion`, () => {
    const notice = internationalSaleNotice({ currency, amount_minor: 59900 }, 'Bundle');
    assert.equal(notice.amount, new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(599));
  });
}
test('test/pending international sales never notify; duplicate event skips web push', async () => {
  let status = 'test_paid';
  let inserts = 0;
  const client = { from: (table: string) => {
    const builder: any = {
      select: () => builder, eq: () => builder,
      maybeSingle: async () => ({ data: table === 'international_payments' ? { status, created_at: '2026-11-14T00:00:00Z', reference: 'reference', currency: 'ZAR', amount_minor: 59900, user_id: 'owner', product_id: 'product' } : { name: 'Bundle' } }),
      insert: async () => { inserts++; return { error: { code: '23505' } }; },
    };
    return builder;
  } } as unknown as SupabaseClient;
  await notifyInternationalSale(client, 'reference');
  status = 'pending';
  await notifyInternationalSale(client, 'reference');
  assert.equal(inserts, 0);
  status = 'paid';
  await notifyInternationalSale(client, 'reference');
  assert.equal(inserts, 1);
});