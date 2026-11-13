export const DIGITAL_EMAIL_LINK_SECONDS = 7 * 24 * 60 * 60;
export const EMAIL_LAUNCH_DATE = '2026-11-13T00:00:00.000Z';

export function canEmailPurchase(payment: { status: string; is_test?: boolean; metadata?: { test_mode?: unknown } | null }) {
  return payment.status === 'paid' && payment.is_test !== true && payment.metadata?.test_mode !== true;
}

export function safeDeliveryUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function canWelcomeAccount(user: { email_confirmed_at?: string | null; created_at: string }) {
  return Boolean(user.email_confirmed_at) && Date.parse(user.created_at) >= Date.parse(EMAIL_LAUNCH_DATE);
}