// Hexmo SMS provider (https://hexmo.net/developers/docs)
// Server-only. Reads HEXMO_API_TOKEN at call time.

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
  const token = process.env.HEXMO_API_TOKEN;
  if (!token) {
    return { ok: false, status: 0, raw: null, error: "HEXMO_API_TOKEN não configurado" };
  }

  const recipients = input.recipient
    .split(",")
    .map((r) => normalizeRecipient(r.trim()))
    .filter(Boolean)
    .join(",");

  const sender = (input.sender_id || "").slice(0, 11);

  const body = {
    recipient: recipients,
    sender_id: sender,
    type: "plain",
    message: input.message,
  };

  let res: Response;
  try {
    res = await fetch("https://hexmo.net/api/v3/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    console.log("[hexmo] network error", e?.message, "body=", body);
    return { ok: false, status: 0, raw: null, error: e?.message || "network error" };
  }

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep text */ }

  if (!res.ok || (json && json.status === "error")) {
    const msg = json?.message || text || `HTTP ${res.status}`;
    console.log("[hexmo] error", res.status, "msg=", msg, "request=", body);
    return { ok: false, status: res.status, raw: json ?? text, error: String(msg) };
  }

  return { ok: true, status: res.status, raw: json ?? text };
}
