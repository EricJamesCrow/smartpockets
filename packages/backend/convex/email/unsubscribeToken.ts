/**
 * RFC 8058 unsubscribe token: HMAC-SHA256 over a JSON payload, 30-day TTL.
 *
 * Uses WebCrypto so this module runs in both Convex's V8 HTTP runtime
 * (where /email/unsubscribe lives) and in Node actions.
 */

type TokenPayload = { userId: string; templateKey: string; ts?: number };
type VerifiedPayload = { userId: string; templateKey: string; expired: boolean };

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function utf8(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function base64urlFromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlToBytes(s: string): Uint8Array {
  // Pad to a multiple of 4. For length L the required `=` count is
  // `(4 - L % 4) % 4`. The previous formula `"==".slice((L + 3) % 4)`
  // returned the wrong count for non-multiple-of-4 lengths and
  // produced strings that `atob` rejected with "invalid characters".
  const padCount = (4 - (s.length % 4)) % 4;
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padCount);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function importHmacKey(key: string): Promise<CryptoKey> {
  // Signing key is hex-encoded (openssl rand -hex 32) if possible;
  // otherwise fall back to raw utf-8 so misconfigured keys still verify
  // deterministically in dev.
  const raw = /^[0-9a-f]+$/i.test(key) && key.length % 2 === 0
    ? hexToBytes(key)
    : utf8(key);
  return await crypto.subtle.importKey(
    "raw",
    raw as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function hmacSign(payload: string, key: string): Promise<Uint8Array> {
  const cryptoKey = await importHmacKey(key);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, utf8(payload) as unknown as BufferSource);
  return new Uint8Array(sig);
}

async function hmacVerify(
  payload: string,
  signature: Uint8Array,
  key: string,
): Promise<boolean> {
  const cryptoKey = await importHmacKey(key);
  return await crypto.subtle.verify(
    "HMAC",
    cryptoKey,
    signature as unknown as BufferSource,
    utf8(payload) as unknown as BufferSource,
  );
}

export async function signUnsubscribeToken(
  input: TokenPayload,
  key: string,
): Promise<string> {
  const payload = {
    u: input.userId,
    t: input.templateKey,
    ts: input.ts ?? Date.now(),
  };
  const encoded = base64urlFromBytes(utf8(JSON.stringify(payload)));
  const sig = await hmacSign(encoded, key);
  return `${encoded}.${base64urlFromBytes(sig)}`;
}

export type VerifyResult =
  | { ok: true; data: VerifiedPayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "unparseable" };

export async function verifyUnsubscribeToken(
  token: string,
  key: string,
): Promise<VerifyResult> {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [encoded, sig] = parts;
  let signatureBytes: Uint8Array;
  try {
    signatureBytes = base64urlToBytes(sig!);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const valid = await hmacVerify(encoded!, signatureBytes, key);
  if (!valid) return { ok: false, reason: "bad_signature" };
  try {
    const parsed = JSON.parse(
      new TextDecoder().decode(base64urlToBytes(encoded!)),
    ) as { u: string; t: string; ts: number };
    const expired = Date.now() - parsed.ts > TTL_MS;
    return {
      ok: true,
      data: { userId: parsed.u, templateKey: parsed.t, expired },
    };
  } catch {
    return { ok: false, reason: "unparseable" };
  }
}
