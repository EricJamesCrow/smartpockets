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
 * COMPONENT NOTE: This module is called from client/index.ts registerRoutes.
 * Plaid credentials are passed at call time, not read from process.env.
 *
 * @see https://plaid.com/docs/api/webhooks/webhook-verification/
 */
export interface WebhookVerificationResult {
    isValid: boolean;
    error?: string;
}
export interface PlaidWebhookPayload {
    webhook_type: string;
    webhook_code: string;
    item_id: string;
    error?: {
        error_code: string;
        error_message: string;
        error_type: string;
    };
    new_transactions?: number;
    removed_transactions?: string[];
    consent_expiration_time?: string;
}
/**
 * Verify a Plaid webhook signature.
 *
 * Implements retry logic with cache invalidation to handle Plaid key rotation.
 * If verification fails and the key was from cache, clears the cache entry
 * and retries with a fresh key before returning an error.
 *
 * @param jwt - The JWT from the Plaid-Verification header
 * @param rawBody - The raw request body as a string (NOT parsed JSON)
 * @param plaidConfig - Plaid API credentials for key fetching
 * @returns Verification result with isValid and optional error
 */
export declare function verifyPlaidWebhook(jwt: string, rawBody: string, plaidConfig: {
    plaidClientId: string;
    plaidSecret: string;
    plaidEnv: string;
}): Promise<WebhookVerificationResult>;
/**
 * Invalidate a cached verification key.
 *
 * Used when JWT verification fails to force a fresh key fetch on retry.
 * This handles Plaid key rotation scenarios where the cached key becomes stale.
 *
 * @param kid - Key ID to invalidate
 */
export declare function invalidateCachedKey(kid: string): void;
/**
 * Check if a key is currently cached.
 *
 * @param kid - Key ID to check
 * @returns true if the key is in the cache
 */
export declare function isKeyCached(kid: string): boolean;
/**
 * Compute SHA-256 hash of a string using Web Crypto API.
 *
 * @param data - String to hash
 * @returns Hex-encoded SHA-256 hash
 */
export declare function computeSha256(data: string): Promise<string>;
/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export declare function constantTimeCompare(a: string, b: string): boolean;
/**
 * Parse and validate a Plaid webhook payload.
 *
 * @param body - Raw JSON body string
 * @returns Parsed webhook payload
 * @throws Error if parsing fails
 */
export declare function parseWebhookPayload(body: string): PlaidWebhookPayload;
/**
 * Check if this is a transaction sync webhook.
 */
export declare function isTransactionSyncWebhook(webhookType: string, webhookCode: string): boolean;
/**
 * Check if this is an item error webhook.
 */
export declare function isItemErrorWebhook(webhookType: string, webhookCode: string): boolean;
/**
 * Check if this is a pending expiration webhook (needs re-auth).
 */
export declare function isPendingExpirationWebhook(webhookType: string, webhookCode: string): boolean;
/**
 * Check if user has revoked permission.
 */
export declare function isUserPermissionRevokedWebhook(webhookType: string, webhookCode: string): boolean;
/**
 * Check if this is a liabilities update webhook.
 */
export declare function isLiabilitiesUpdateWebhook(webhookType: string, webhookCode: string): boolean;
/**
 * Check if this is an initial transactions update (historical sync complete).
 */
export declare function isInitialUpdateWebhook(webhookType: string, webhookCode: string): boolean;
/**
 * Check if this is a historical transactions update.
 */
export declare function isHistoricalUpdateWebhook(webhookType: string, webhookCode: string): boolean;
/**
 * Configuration for webhook deduplication
 */
export declare const DEDUP_CONFIG: {
    /** Time window in ms to check for duplicates (24 hours - Plaid may retry over extended periods) */
    readonly windowMs: number;
};
/**
 * Generate a unique webhook ID for logging and tracking.
 *
 * @param itemId - Plaid item_id
 * @param webhookCode - Webhook code (e.g., "SYNC_UPDATES_AVAILABLE")
 * @param timestamp - Unix timestamp
 * @returns Unique webhook ID string
 */
export declare function generateWebhookId(itemId: string, webhookCode: string, timestamp: number): string;
/**
 * Create a webhook log entry structure.
 *
 * @param params - Webhook parameters
 * @returns Webhook log entry (ready for mutation)
 */
export declare function createWebhookLogEntry(params: {
    itemId: string;
    webhookType: string;
    webhookCode: string;
    bodyHash: string;
    status?: "received" | "processing" | "processed" | "duplicate" | "failed";
}): {
    webhookId: string;
    itemId: string;
    webhookType: string;
    webhookCode: string;
    bodyHash: string;
    receivedAt: number;
    status: "received" | "processing" | "processed" | "duplicate" | "failed";
};
//# sourceMappingURL=webhooks.d.ts.map