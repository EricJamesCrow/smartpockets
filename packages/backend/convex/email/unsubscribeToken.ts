import { createHmac, timingSafeEqual } from "crypto";

type TokenPayload = { userId: string; templateKey: string; ts?: number };
type VerifiedPayload = { userId: string; templateKey: string; expired: boolean };

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "==".slice((s.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

function hmac(payload: string, key: string): Buffer {
  // Key is either hex-encoded (preferred) or utf-8 fallback.
  const keyBuf = /^[0-9a-f]+$/i.test(key) && key.length % 2 === 0
    ? Buffer.from(key, "hex")
    : Buffer.from(key, "utf8");
  return createHmac("sha256", keyBuf).update(payload, "utf8").digest();
}

export function signUnsubscribeToken(input: TokenPayload, key: string): string {
  const payload = {
    u: input.userId,
    t: input.templateKey,
    ts: input.ts ?? Date.now(),
  };
  const encoded = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = base64url(hmac(encoded, key));
  return `${encoded}.${sig}`;
}

export type VerifyResult =
  | { ok: true; data: VerifiedPayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "unparseable" };

export function verifyUnsubscribeToken(token: string, key: string): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [encoded, sig] = parts;
  const expected = base64url(hmac(encoded, key));
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }
  try {
    const parsed = JSON.parse(base64urlDecode(encoded).toString("utf8")) as {
      u: string;
      t: string;
      ts: number;
    };
    const expired = Date.now() - parsed.ts > TTL_MS;
    return {
      ok: true,
      data: { userId: parsed.u, templateKey: parsed.t, expired },
    };
  } catch {
    return { ok: false, reason: "unparseable" };
  }
}
