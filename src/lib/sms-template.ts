// Default post-payment SMS; authorized sellers may replace it in integrations.
// ASCII-only e curto: evita UCS-2 (70 chars/segmento) para caber em 1-2 segmentos GSM-7 (160 chars),
// garantindo que os numeros de suporte do usuario chegam sempre ao cliente.
export const FIXED_SMS_TEMPLATE =
  "{nome}, pagamento de {valor} recebido para {produto}. SUPORTE: {suporte1} / {suporte2} (admin {suporte3}). Link: {link}";

export function canEditPaymentSms(roles: readonly string[]) {
  return roles.some((role) => role === "admin" || role === "premium");
}

export function selectPaymentSmsTemplate(template: unknown, roles: readonly string[]) {
  return canEditPaymentSms(roles) && typeof template === "string" && template.trim()
    ? template.trim().slice(0, 500)
    : FIXED_SMS_TEMPLATE;
}

export function buildFixedSmsTemplate(v: {
  nome: string; produto: string; valor: string; link?: string;
  suporte1: string; suporte2: string; suporte3: string;
}, template = FIXED_SMS_TEMPLATE) {
  const values: Record<string, string> = { ...v, link: v.link || "-", suporte: v.suporte1 || "-" };
  return template.replace(/\{(nome|produto|valor|link|suporte|suporte1|suporte2|suporte3)\}/g,
    (_, key: string) => values[key] || "-");
}
