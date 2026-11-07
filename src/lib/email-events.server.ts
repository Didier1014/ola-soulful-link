import type { EmailWebhookEvent } from '@lovable.dev/email-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const OUTCOMES = {
  'email.bounced': { reason: 'bounce', status: 'bounced', message: 'Permanent bounce — email address is invalid or rejected' },
  'email.complaint': { reason: 'complaint', status: 'complained', message: 'Spam complaint — recipient marked email as spam' },
  'email.unsubscribed': { reason: 'unsubscribe', status: 'suppressed', message: 'Recipient unsubscribed' },
} as const

/** Kept legacy records are notifications only; they never authorize or gate sends. */
export async function recordEmailEvent(client: SupabaseClient, event: EmailWebhookEvent) {
  if (!(event.type in OUTCOMES)) return
  const outcome = OUTCOMES[event.type as keyof typeof OUTCOMES]
  const email = event.data.recipient.toLowerCase()
  const checkWrite = (error: { code: string; message: string } | null) => {
    if (!error) return
    console.error('Email event write failed', { code: error.code, message: error.message, event_id: event.event_id })
    throw new Error('Email event write failed')
  }
  const { error: suppressionError } = await client.from('suppressed_emails').upsert(
    { email, reason: outcome.reason, metadata: null },
    { onConflict: 'email' },
  )
  checkWrite(suppressionError)

  // Stable primary key makes redelivery idempotent without new tables or indexes.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(event.event_id))
  const hex = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
  const { error: logError } = await client.from('email_send_log').upsert({
    id,
    message_id: event.data.message_id ?? null,
    template_name: 'system',
    recipient_email: email,
    status: outcome.status,
    error_message: outcome.message,
    metadata: null,
  }, { onConflict: 'id', ignoreDuplicates: true })
  checkWrite(logError)
}