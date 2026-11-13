import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendPurchaseEmails } from './purchase-email.server';

test('verified international purchase emails buyer delivery and seller in original ledger currency with deduped keys', async () => {
  const originalFetch = globalThis.fetch;
  const key = process.env['LOVABLE_API_KEY'];
  const url = process.env['LOVABLE_SEND_URL'];
  process.env['LOVABLE_API_KEY'] = 'fixture';
  process.env['LOVABLE_SEND_URL'] = 'https://email.example.test';
  const sends: Record<string, any>[] = [];
  const signing: Array<[string, number]> = [];
  const fixtures: Record<string, unknown> = {
    international_payments: { reference: 'payment-123', status: 'paid', created_at: '2026-11-13T12:00:00Z', user_id: 'seller-123', product_id: 'product-123', currency: 'ZAR', amount_minor: 1000, customer_email: 'buyer@example.test', customer_name: 'Buyer' },
    products: { name: 'Digital course', product_type: 'digital', digital_file_path: 'seller-123/course.pdf', config: { checkout: { language: 'en' } } },
    profiles: { support_phone: '840000000', support_phone2: '850000000' },
  };
  const client = {
    from: (table: string) => {
      const builder: any = { select: () => builder, eq: () => builder, maybeSingle: async () => ({ data: fixtures[table], error: null }), insert: async () => ({ error: null }) };
      return builder;
    },
    storage: { from: () => ({ createSignedUrl: async (path: string, seconds: number) => { signing.push([path, seconds]); return { data: { signedUrl: 'https://storage.example.test/download?token=fixture' } }; } }) },
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'seller@example.test' } } }) } },
  } as unknown as SupabaseClient;
  try {
    globalThis.fetch = async (_input, init) => { sends.push(JSON.parse(String(init?.body))); return Response.json({ success: true }); };
    await sendPurchaseEmails(client, 'international', 'payment-123');
    assert.equal(sends.length, 2);
    fixtures.international_payments = { status: 'paid', created_at: '2026-06-01T12:00:00Z' };
    await sendPurchaseEmails(client, 'international', 'historical-sale');
    assert.equal(sends.length, 2);
    assert.equal(sends[0]?.to, 'buyer@example.test');
    assert.equal(sends[0]?.idempotency_key, 'product-delivery-international-payment-123');
    assert.match(sends[0]?.html, /storage\.example\.test\/download/);
    assert.match(sends[0]?.text, /ZAR/);
    assert.equal(sends[1]?.to, 'seller@example.test');
    assert.equal(sends[1]?.idempotency_key, 'sale-email-international-payment-123');
    assert.deepEqual(signing, [['seller-123/course.pdf', 604800]]);
    fixtures.international_payments = { status: 'test_paid' };
    await sendPurchaseEmails(client, 'international', 'payment-test');
    assert.equal(sends.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (key === undefined) delete process.env['LOVABLE_API_KEY']; else process.env['LOVABLE_API_KEY'] = key;
    if (url === undefined) delete process.env['LOVABLE_SEND_URL']; else process.env['LOVABLE_SEND_URL'] = url;
  }
});