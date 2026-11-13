import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { canWelcomeAccount } from './email-policy';

export const sendAccountWelcome = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.auth.getUser();
  if (error || !data.user?.email || !canWelcomeAccount(data.user)) return { ok: false, reason: 'not_new_confirmed_account' };
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { sendAppEmail } = await import('./email.server');
  return sendAppEmail(supabaseAdmin, { templateName: 'account-welcome', recipientEmail: data.user.email, idempotencyKey: `welcome-${context.userId}`, templateData: { name: data.user.user_metadata?.full_name ?? 'Olá' } });
});

export const sendSelfEmailTest = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.auth.getUser();
  if (error || !data.user?.email || !data.user.email_confirmed_at) throw new Error('Confirme o seu email primeiro.');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { sendAppEmail } = await import('./email.server');
  // One recipient, fixed template and one logical test per account per hour.
  return sendAppEmail(supabaseAdmin, { templateName: 'email-test', recipientEmail: data.user.email, idempotencyKey: `email-test-${context.userId}-${new Date().toISOString().slice(0, 13)}`, templateData: { name: data.user.user_metadata?.full_name ?? 'Olá', test: true } });
});