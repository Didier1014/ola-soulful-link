import { createEmailWebhookHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'
import { recordEmailEvent } from '@/lib/email-events.server'

export const Route = createFileRoute("/lovable/email/events")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']
        if (!apiKey) {
          console.error('Missing required environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }
        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            'email.bounced': async (event) => {
              const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
              await recordEmailEvent(supabaseAdmin, event)
            },
            'email.complaint': async (event) => {
              const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
              await recordEmailEvent(supabaseAdmin, event)
            },
            'email.unsubscribed': async (event) => {
              const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
              await recordEmailEvent(supabaseAdmin, event)
            },
          },
        })
        return handler(request)
      },
    },
  },
})
