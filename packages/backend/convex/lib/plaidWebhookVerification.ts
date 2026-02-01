/**
 * Plaid Webhook Signature Verification
 *
 * Verifies that incoming webhooks are genuinely from Plaid using JWT signatures.
 * Uses jose library for JWT verification (Web Crypto compatible).
 *
 * Security flow:
 * 1. Extract JWT from Plaid-Verification header
 * 2. Decode header to get key ID (kid)
 * 3. Fetch public key from Plaid (cached)
 * 4. Verify JWT signature (ES256)
 * 5. Verify body SHA-256 hash matches
 * 6. Verify timestamp is recent (< 5 minutes)
 *
 * @see https://plaid.com/docs/api/webhooks/webhook-verification/
 */

import { decodeProtectedHeader, jwtVerify, importJWK, type JWK } from "jose";

// Type for verification keys - can be CryptoKey or Uint8Array depending on runtime
type VerificationKey = Awaited<ReturnType<typeof importJWK>>;
import { PlaidApi, Configuration, PlaidEnvironments } from "plaid";

// Create Plaid client for webhook verification
function getPlaidClient(): PlaidApi {
  const env = process.env.PLAID_ENV || "sandbox";
  const baseUrl =
    env === "production"
      ? PlaidEnvironments.production
      : env === "development"
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox;

  const config = new Configuration({
    basePath: baseUrl,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET,
      },
    },
  });

  return new PlaidApi(config);
}

// Cache verification keys (Plaid recommends caching)
// Map<kid, { key: VerificationKey, expires: number }>
const keyCache = new Map<string, { key: VerificationKey; expires: number }>();
const KEY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if webhook verification should be skipped.
 *
 * In sandbox mode with SKIP_WEBHOOK_VERIFICATION=true, verification can be skipped.
 * In production, verification is ALWAYS enforced regardless of flag.
 *
 * @returns true if verification should be skipped
 */
export function shouldSkipVerification(): boolean {
  const env = process.env.PLAID_ENV || "sandbox";
  const skipFlag = process.env.SKIP_WEBHOOK_VERIFICATION === "true";

  // NEVER skip in production
  if (env === "production") {
    if (skipFlag) {
      console.warn(
        "[Webhook Verification] SKIP_WEBHOOK_VERIFICATION ignored in production"
      );
    }
    return false;
  }

  // In sandbox/development, allow skipping for testing
  return skipFlag;
}

/**
 * Verify a Plaid webhook signature.
 *
 * @param jwt - The JWT from the Plaid-Verification header
 * @param rawBody - The raw request body as a string (NOT parsed JSON)
 * @returns true if webhook is verified
 * @throws Error if verification fails
 */
export async function verifyPlaidWebhook(
  jwt: string,
  rawBody: string
): Promise<boolean> {
  // Step 1: Decode JWT header to get key ID (without verification)
  const protectedHeader = decodeProtectedHeader(jwt);

  // Step 2: Verify algorithm is ES256 (Plaid uses ECDSA with P-256)
  if (protectedHeader.alg !== "ES256") {
    throw new Error(
      `Invalid JWT algorithm: ${protectedHeader.alg}, expected ES256`
    );
  }

  const kid = protectedHeader.kid;
  if (!kid) {
    throw new Error("Missing key ID (kid) in JWT header");
  }

  // Step 3: Get public key (with caching)
  const publicKey = await getVerificationKey(kid);

  // Step 4: Verify JWT signature and get payload
  const { payload } = await jwtVerify(jwt, publicKey, {
    algorithms: ["ES256"],
  });

  // Step 5: Verify timestamp is recent (< 5 minutes)
  const iat = payload.iat as number;
  const now = Math.floor(Date.now() / 1000);
  const maxAge = 5 * 60; // 5 minutes in seconds

  if (now - iat > maxAge) {
    throw new Error(`Webhook too old: ${now - iat} seconds (max ${maxAge})`);
  }

  // Step 6: Verify body hash matches
  const expectedHash = payload.request_body_sha256 as string;
  if (!expectedHash) {
    throw new Error("Missing request_body_sha256 in JWT payload");
  }

  const actualHash = await computeSha256(rawBody);

  if (!constantTimeCompare(expectedHash, actualHash)) {
    throw new Error("Body hash mismatch - request may have been tampered");
  }

  return true;
}

/**
 * Get Plaid's verification key by key ID (with caching).
 *
 * @param kid - Key ID from JWT header
 * @returns Public key for verification
 */
async function getVerificationKey(kid: string): Promise<VerificationKey> {
  // Check cache first
  const cached = keyCache.get(kid);
  if (cached && cached.expires > Date.now()) {
    return cached.key;
  }

  // Fetch from Plaid API
  const plaidClient = getPlaidClient();
  const response = await plaidClient.webhookVerificationKeyGet({
    key_id: kid,
  });

  // Import the JWK
  const jwk = response.data.key;
  const key = await importJWK(jwk as JWK, "ES256");

  // Cache the key
  keyCache.set(kid, {
    key: key as VerificationKey,
    expires: Date.now() + KEY_CACHE_TTL_MS,
  });

  return key as VerificationKey;
}

/**
 * Compute SHA-256 hash of a string using Web Crypto API.
 *
 * @param data - String to hash
 * @returns Hex-encoded SHA-256 hash
 */
export async function computeSha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
