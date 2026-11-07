import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmailWebhookEvent } from '@lovable.dev/email-js'
import { recordEmailEvent } from './email-events.server'
import { sendAppEmail } from './email.server'

function auditClient(fail = false) {
  const writes: Array<{ table: string; row: Record<string, unknown> }> = []
  const client = { from: (table: string) => ({
    insert: async (row: Record<string, unknown>) => {
      writes.push({ table, row })
      return { error: fail ? { code: 'fixture', message: 'write rejected' } : null }
    },
    upsert: async (row: Record<string, unknown>) => {
      writes.push({ table, row })
      return { error: fail ? { code: 'fixture', message: 'write rejected' } : null }
    },
  }) } as unknown as SupabaseClient
  return { client, writes }
}

test('managed notification sends synchronously, preserves idempotency and audits actual outcomes', async () => {
  const originalFetch = globalThis.fetch
  const oldKey = process.env['LOVABLE_API_KEY']
  const oldUrl = process.env['LOVABLE_SEND_URL']
  process.env['LOVABLE_API_KEY'] = 'unit-test-fixture'
  process.env['LOVABLE_SEND_URL'] = 'https://email.example.test/send'
  try {
    for (const outcome of ['sent', 'suppressed', 'failed'] as const) {
      let requestBody: Record<string, unknown> = {}
      globalThis.fetch = async (_url, init) => {
        requestBody = JSON.parse(String(init?.body))
        return outcome === 'sent'
          ? Response.json({ success: true })
          : Response.json({ type: outcome === 'suppressed' ? 'recipient_suppressed' : 'domain_not_verified', message: 'fixture' }, { status: 403 })
      }
      const { client, writes } = auditClient()
      const result = await sendAppEmail(client, {
        templateName: 'sale-confirmation', recipientEmail: 'merchant@example.test',
        idempotencyKey: 'sale-confirm-123', templateData: {},
      })
      assert.equal(result.ok, outcome === 'sent')
      assert.equal(requestBody.idempotency_key, 'sale-confirm-123')
      assert.equal(requestBody.purpose, 'transactional')
      assert.equal(requestBody.sender_domain, 'notify.www.redoxpay.site')
      assert.equal('unsubscribe_token' in requestBody, false)
      assert.equal(writes.length, 1)
      assert.equal(writes[0]?.table, 'email_send_log')
      assert.equal(writes[0]?.row.status, outcome)
    }
  } finally {
    globalThis.fetch = originalFetch
    if (oldKey === undefined) delete process.env['LOVABLE_API_KEY']; else process.env['LOVABLE_API_KEY'] = oldKey
    if (oldUrl === undefined) delete process.env['LOVABLE_SEND_URL']; else process.env['LOVABLE_SEND_URL'] = oldUrl
  }
})

test('outcomes preserve legacy bounce, complaint and unsubscribe constraints and dedupe redelivery', async () => {
  for (const [type, reason, status] of [
    ['email.bounced', 'bounce', 'bounced'],
    ['email.complaint', 'complaint', 'complained'],
    ['email.unsubscribed', 'unsubscribe', 'suppressed'],
  ] as const) {
    const event = { type, event_id: `event-${type}`, data: { recipient: 'Merchant@Example.test', message_id: 'message-fixture' } } as EmailWebhookEvent
    const { client, writes } = auditClient()
    await recordEmailEvent(client, event)
    await recordEmailEvent(client, event)
    assert.equal(writes[0]?.row.reason, reason)
    assert.equal(writes[0]?.row.email, 'merchant@example.test')
    assert.equal(writes[1]?.row.status, status)
    assert.equal(writes[1]?.row.template_name, 'system')
    assert.equal(writes[1]?.row.metadata, null)
    assert.equal(writes[1]?.row.id, writes[3]?.row.id)
    assert.match(String(writes[1]?.row.id), /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/)
    await assert.rejects(recordEmailEvent(auditClient(true).client, event), /write failed/)
  }
})