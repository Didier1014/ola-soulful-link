// @ts-nocheck
// Worker-compatible Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID).
// Replaces the `web-push` npm package which depends on Node-only APIs.

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str: string): Uint8Array {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrays) { out.set(a, o); o += a.length; }
  return out;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}
async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  return hmacSha256(salt, ikm);
}
async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  // single-block expand (length <= 32 here)
  const t = await hmacSha256(prk, concat(info, new Uint8Array([0x01])));
  return t.slice(0, length);
}

function importVapidPublicKey(b64urlPub: string): { x: string; y: string; raw: Uint8Array } {
  const raw = b64urlDecode(b64urlPub);
  if (raw.length !== 65 || raw[0] !== 0x04) throw new Error("VAPID public key must be 65-byte uncompressed P-256 point");
  return { x: b64urlEncode(raw.slice(1, 33)), y: b64urlEncode(raw.slice(33, 65)), raw };
}

async function signVapidJwt(audience: string, subject: string, vapidPub: string, vapidPriv: string): Promise<string> {
  const { x, y } = importVapidPublicKey(vapidPub);
  const dBytes = b64urlDecode(vapidPriv);
  const jwk = { kty: "EC", crv: "P-256", x, y, d: b64urlEncode(dBytes), ext: true };
  const key = await crypto.subtle.importKey("jwk", jwk as any, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);

  const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  })));
  const unsigned = `${header}.${payload}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned)));
  return `${unsigned}.${b64urlEncode(sig)}`;
}

async function deriveEcdhSharedSecret(uaPubRaw: Uint8Array, ephJwkPriv: JsonWebKey): Promise<Uint8Array> {
  if (uaPubRaw.length !== 65 || uaPubRaw[0] !== 0x04) throw new Error("UA public key invalid");
  const uaJwk: JsonWebKey = {
    kty: "EC", crv: "P-256",
    x: b64urlEncode(uaPubRaw.slice(1, 33)),
    y: b64urlEncode(uaPubRaw.slice(33, 65)),
    ext: true,
  };
  const uaKey = await crypto.subtle.importKey("jwk", uaJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const privKey = await crypto.subtle.importKey("jwk", ephJwkPriv, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey } as any, privKey, 256);
  return new Uint8Array(bits);
}

async function encryptPayload(payload: string, p256dhB64: string, authB64: string): Promise<Uint8Array> {
  const uaPubRaw = b64urlDecode(p256dhB64);
  const authSecret = b64urlDecode(authB64);

  // Ephemeral ECDH keypair
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const ephPubJwk = await crypto.subtle.exportKey("jwk", eph.publicKey);
  const ephPrivJwk = await crypto.subtle.exportKey("jwk", eph.privateKey);
  const asPubRaw = concat(
    new Uint8Array([0x04]),
    b64urlDecode(ephPubJwk.x!),
    b64urlDecode(ephPubJwk.y!),
  );

  const ecdhSecret = await deriveEcdhSharedSecret(uaPubRaw, ephPrivJwk);

  // PRK_key = HMAC-SHA256(auth_secret, ecdh_secret)
  const prkKey = await hkdfExtract(authSecret, ecdhSecret);
  // key_info = "WebPush: info\0" || ua_public || as_public
  const keyInfo = concat(new TextEncoder().encode("WebPush: info\0"), uaPubRaw, asPubRaw);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdfExpand(prk, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);

  const plaintext = concat(new TextEncoder().encode(payload), new Uint8Array([0x02])); // last-record delimiter
  const cekKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cekKey, plaintext));

  // Header: salt(16) | rs(4 BE) | idlen(1) | as_public(65)
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs, false);
  header[20] = 65;
  header.set(asPubRaw, 21);

  return concat(header, ciphertext);
}

export async function sendWebPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapid: { publicKey: string; privateKey: string; subject: string },
  ttlSeconds = 60,
): Promise<{ status: number; body: string }> {
  const audience = new URL(subscription.endpoint).origin;
  const jwt = await signVapidJwt(audience, vapid.subject, vapid.publicKey, vapid.privateKey);
  const body = await encryptPayload(payload, subscription.p256dh, subscription.auth);

  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "TTL": String(ttlSeconds),
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "Authorization": `vapid t=${jwt}, k=${vapid.publicKey}`,
    },
    body,
  });
  const text = await res.text().catch(() => "");
  return { status: res.status, body: text };
}
