// Legacy adapter: all existing SMS callers now use the secure MozeSMS connection.

export interface HexmoSendInput {
  recipient: string; // E.164 without "+", comma-separated for multiple
  sender_id: string; // alphanumeric ≤ 11 chars OR phone
  message: string;
}

export interface HexmoResult {
  ok: boolean;
  status: number;
  raw: unknown;
  error?: string;
}

function normalizeRecipient(raw: string): string {
  // Accept "+258...", "258...", "8X..." (assume MZ if 9 digits starting 8)
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("8")) return `258${digits}`;
  return digits;
}

export async function hexmoSendSms(input: HexmoSendInput): Promise<HexmoResult> {
  const token = process.env['LOVABLE_API_KEY'];
  const connectionKey = process.env['UDC_MOZESMS_API_KEY'];
  if (!token || !connectionKey) {
    return { ok: false, status: 0, raw: null, error: "Ligação MozeSMS não configurada" };
  }

  const recipients = input.recipient
    .split(",")
    .map((r) => normalizeRecipient(r.trim()))
    .filter(Boolean)
    ;
  if (!recipients.length || recipients.some((phone) => !/^2588[2-7]\d{7}$/.test(phone)) || !input.message.trim()) {
    return { ok: false, status: 400, raw: null, error: "Número ou mensagem inválidos" };
  }
  const bulk = recipients.length > 1;
  const body = bulk
    ? { sender_id: "ESHOP", messages: recipients.map((phone) => ({ phone, message: input.message })) }
    : { phone: recipients[0], message: input.message, sender_id: "ESHOP" };

  let res: Response;
  try {
    res = await fetch(`https://connector-gateway.lovable.dev/udc_mozesms/sms/${bulk ? "bulk" : "send"}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Connection-Api-Key": connectionKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  } catch (e: any) {
    console.error("[mozesms] network failure");
    return { ok: false, status: 0, raw: null, error: "Não foi possível contactar a MozeSMS" };
  }

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep text */ }

  if (!res.ok || json?.success !== true) {
    console.error("[mozesms] rejected", res.status);
    const error = res.status === 402 ? "Saldo MozeSMS insuficiente" : `MozeSMS recusou o envio (HTTP ${res.status})`;
    return { ok: false, status: res.status, raw: { success: false }, error };
  }

  return { ok: true, status: res.status, raw: { success: true, id: json?.data?.id, status: json?.data?.status } };
}
