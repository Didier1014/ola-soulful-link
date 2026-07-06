// Modelo de SMS fixo — igual para todos os usuários.
// Apenas os números de suporte são configuráveis (suporte1/suporte2 pelo usuário no Perfil;
// suporte3 é o número do admin, configurado via secret ADMIN_SUPPORT_PHONE).
// ASCII-only e curto: evita UCS-2 (70 chars/segmento) para caber em 1-2 segmentos GSM-7 (160 chars),
// garantindo que os numeros de suporte do usuario chegam sempre ao cliente.
export const FIXED_SMS_TEMPLATE =
  "{nome}, pagamento de {valor} recebido para {produto}. SUPORTE: {suporte1} / {suporte2} (admin {suporte3}). Link: {link}";

export function buildFixedSmsTemplate(v: {
  nome: string; produto: string; valor: string; link?: string;
  suporte1: string; suporte2: string; suporte3: string;
}) {
  return FIXED_SMS_TEMPLATE
    .replaceAll("{nome}", v.nome)
    .replaceAll("{produto}", v.produto)
    .replaceAll("{valor}", v.valor)
    .replaceAll("{link}", v.link || "—")
    .replaceAll("{suporte1}", v.suporte1 || "—")
    .replaceAll("{suporte2}", v.suporte2 || "—")
    .replaceAll("{suporte3}", v.suporte3 || "—");
}
