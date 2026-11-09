const BASE = "https://game.makavisual.online/api/api/v1";

export type VendusValidation = { connected: boolean; status: number; message: string };

/** Rule: 401/403 = invalid credentials; any other HTTP status = valid. Never logs or returns the key. */
export function classifyVendusStatus(status: number, message: string): VendusValidation {
  if (status === 401 || status === 403) {
    return { connected: false, status, message: message || "Credenciais inválidas" };
  }
  return { connected: true, status, message: "VendusPay ligada" };
}

export async function validateVendusCredentials(apiKey: string, clientId?: string): Promise<VendusValidation> {
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
  if (clientId && clientId.trim()) headers["X-Client-Id"] = clientId.trim();
  const url = `${BASE}/payments/status?partner_transaction_id=VALIDACAO000&payment_type=push`;
  const res = await fetch(url, { headers });
  let message = "";
  try {
    const body = await res.json();
    message = String(body?.error ?? body?.message ?? "");
  } catch {
    message = "";
  }
  return classifyVendusStatus(res.status, message.split(apiKey).join("***"));
}
