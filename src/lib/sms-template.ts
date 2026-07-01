// Modelo de SMS fixo — igual para todos os usuários.
// Apenas os números de suporte são configuráveis (suporte1/suporte2 pelo usuário no Perfil;
// suporte3 é o número do admin, configurado via secret ADMIN_SUPPORT_PHONE).
export const FIXED_SMS_TEMPLATE =
  "{nome}, pagamento recebido com sucesso de {valor} para {produto}\nSUPORTE ou Reclamações: {suporte1} , {suporte2}\n{suporte3}";

export function buildFixedSmsTemplate(v: {
  nome: string; produto: string; valor: string;
  suporte1: string; suporte2: string; suporte3: string;
}) {
  return FIXED_SMS_TEMPLATE
    .replaceAll("{nome}", v.nome)
    .replaceAll("{produto}", v.produto)
    .replaceAll("{valor}", v.valor)
    .replaceAll("{suporte1}", v.suporte1 || "—")
    .replaceAll("{suporte2}", v.suporte2 || "—")
    .replaceAll("{suporte3}", v.suporte3 || "—");
}
