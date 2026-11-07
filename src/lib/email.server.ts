// Best-effort app notifications: delivery failures never undo business actions.
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendTemplateEmail } from '@/lib/email-templates/send-email'
import { TEMPLATES } from '@/lib/email-templates/registry'

export async function sendAppEmail(
  supabaseAdmin: SupabaseClient,
  opts: {
    templateName: string
    recipientEmail: string
    idempotencyKey: string
    templateData?: Record<string, any>
  },
): Promise<{ ok: boolean; reason?: string }> {
  const tag = `[email:${opts.templateName}]`
  const recipient = (TEMPLATES[opts.templateName]?.to || opts.recipientEmail || '').trim()
  if (!TEMPLATES[opts.templateName]) return { ok: false, reason: 'template_not_found' }
  if (!recipient) return { ok: false, reason: 'no_recipient' }

  const logOutcome = async (status: 'sent' | 'suppressed' | 'failed', errorMessage?: string) => {
    try {
      const { error } = await supabaseAdmin.from('email_send_log').insert({
        message_id: null,
        template_name: opts.templateName,
        recipient_email: recipient,
        status,
        ...(errorMessage ? { error_message: errorMessage.slice(0, 1000) } : {}),
      })
      if (error) console.error(`${tag} audit write failed`, { code: error.code, message: error.message })
    } catch {
      console.error(`${tag} audit write failed`)
    }
  }

  try {
    const result = await sendTemplateEmail(opts.templateName, recipient, {
      templateData: opts.templateData,
      idempotencyKey: opts.idempotencyKey,
    })
    if (!result.sent) {
      await logOutcome('suppressed')
      return { ok: false, reason: result.reason }
    }
    await logOutcome('sent')
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await logOutcome('failed', message)
    console.error(`${tag} send failed`)
    return { ok: false, reason: message }
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
