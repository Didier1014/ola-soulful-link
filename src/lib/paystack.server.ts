export async function paystackRequest(path: string, body?: Record<string, unknown>) {
  const key = process.env["LOVABLE_API_KEY"];
  const connection = process.env["UDC_PAYSTACK_API_KEY"];
  if (!key || !connection) throw new Error("Paystack ainda não está configurada");
  const response = await fetch(`https://connector-gateway.lovable.dev/udc_paystack${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": connection, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(25000),
  });
  const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch { throw new Error(`Paystack [${response.status}]: resposta inválida`); }
  // Project credentials never appear in provider request bodies or diagnostic output.
  if (!response.ok || !result.status) throw new Error(`Paystack [${response.status}]: ${String(result.message ?? "Pedido recusado").slice(0, 500)}`);
  return result.data;
}

export async function capabilityHash(capability: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(capability));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}