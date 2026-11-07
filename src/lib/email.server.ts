// Server-side transactional email helper.
// Renders a registered template and enqueues it on the transactional_emails
// queue (processed by /lovable/email/queue/process). Best-effort: never throws.
import * as React from 'react'
import { render } from '@react-email/components'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'RedoxPay'
const SENDER_DOMAIN = 'notify.www.redoxpay.site'
const FROM_DOMAIN = 'notify.www.redoxpay.site'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function sendAppEmail(
  supabaseAdmin: any,
  opts: {
    templateName: string
    recipientEmail: string
    idempotencyKey: string
    templateData?: Record<string, any>
  },
): Promise<{ ok: boolean; reason?: string }> {
  const tag = `[email:${opts.templateName}]`
  try {
    const template = TEMPLATES[opts.templateName]
    if (!template) {
      console.error(`${tag} template not found`)
      return { ok: false, reason: 'template_not_found' }
    }

    const recipient = (template.to || opts.recipientEmail || '').trim()
    if (!recipient) return { ok: false, reason: 'no_recipient' }
    const normalized = recipient.toLowerCase()
    const messageId = crypto.randomUUID()

    // Suppression check (fail-closed)
    const { data: suppressed, error: supErr } = await supabaseAdmin
      .from('suppressed_emails')
      .select('id')
      .eq('email', normalized)
      .maybeSingle()
    if (supErr) {
      console.error(`${tag} suppression check failed`, supErr.message)
      return { ok: false, reason: 'suppression_check_failed' }
    }
    if (suppressed) {
      await supabaseAdmin.from('email_send_log').insert({
        message_id: messageId,
        template_name: opts.templateName,
        recipient_email: recipient,
        status: 'suppressed',
      })
      return { ok: false, reason: 'email_suppressed' }
    }

    // Unsubscribe token (one per address)
    let unsubscribeToken: string
    const { data: existingToken } = await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .select('token, used_at')
      .eq('email', normalized)
      .maybeSingle()

    if (existingToken && !existingToken.used_at) {
      unsubscribeToken = existingToken.token
    } else if (!existingToken) {
      unsubscribeToken = generateToken()
      await supabaseAdmin
        .from('email_unsubscribe_tokens')
        .upsert({ token: unsubscribeToken, email: normalized }, { onConflict: 'email', ignoreDuplicates: true })
      const { data: stored } = await supabaseAdmin
        .from('email_unsubscribe_tokens')
        .select('token')
        .eq('email', normalized)
        .maybeSingle()
      if (!stored) return { ok: false, reason: 'token_failed' }
      unsubscribeToken = stored.token
    } else {
      return { ok: false, reason: 'email_suppressed' }
    }

    // Render
    const templateData = opts.templateData ?? {}
    const element = React.createElement(template.component, templateData)
    const html = await render(element)
    const text = await render(element, { plainText: true })
    const subject =
      typeof template.subject === 'function' ? template.subject(templateData) : template.subject

    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: opts.templateName,
      recipient_email: recipient,
      status: 'pending',
    })

    const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: recipient,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: opts.templateName,
        idempotency_key: opts.idempotencyKey,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error(`${tag} enqueue failed`, enqueueError.message)
      await supabaseAdmin.from('email_send_log').insert({
        message_id: messageId,
        template_name: opts.templateName,
        recipient_email: recipient,
        status: 'failed',
        error_message: 'Failed to enqueue email',
      })
      return { ok: false, reason: 'enqueue_failed' }
    }

    console.log(`${tag} enqueued for ${normalized.replace(/^(.).*,$/, '$1***')}`)
    return { ok: true }
  } catch (e) {
    console.error(`${tag} error`, e)
    return { ok: false, reason: String((e as any)?.message ?? e) }
  }
}

/** Look up a user's email address by id (auth admin). */
export async function getUserEmail(supabaseAdmin: any, userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId)
    return data?.user?.email ?? null
  } catch {
    return null
  }
}
