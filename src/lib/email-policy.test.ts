import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { canEmailPurchase, canWelcomeAccount, DIGITAL_EMAIL_LINK_SECONDS, safeDeliveryUrl } from './email-policy';

test('product delivery requires paid LIVE payment, never pending, failed or test', () => {
  assert.equal(canEmailPurchase({ status: 'paid' }), true);
  for (const status of ['pending', 'failed', 'test_paid']) assert.equal(canEmailPurchase({ status }), false);
  assert.equal(canEmailPurchase({ status: 'paid', is_test: true }), false);
  assert.equal(canEmailPurchase({ status: 'paid', metadata: { test_mode: true } }), false);
});
test('private download links last seven days and only https links are included', () => {
  assert.equal(DIGITAL_EMAIL_LINK_SECONDS, 604800);
  assert.equal(safeDeliveryUrl('https://example.test/file'), 'https://example.test/file');
  for (const value of ['javascript:alert(1)', 'http://example.test', 'https://user:pass@example.test', '/file']) assert.equal(safeDeliveryUrl(value), null);
});
test('welcome only follows confirmation of new accounts, never bulk emails to existing users', () => {
  assert.equal(canWelcomeAccount({ created_at: '2026-11-13T12:00:00Z', email_confirmed_at: '2026-11-13T12:01:00Z' }), true);
  assert.equal(canWelcomeAccount({ created_at: '2026-11-13T12:00:00Z' }), false);
  assert.equal(canWelcomeAccount({ created_at: '2026-06-01T12:00:00Z', email_confirmed_at: '2026-06-01T12:01:00Z' }), false);
});