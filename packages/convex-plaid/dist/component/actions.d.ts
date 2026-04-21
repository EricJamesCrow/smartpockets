/**
 * Plaid Component Actions
 *
 * Core Plaid API actions for Phase 1:
 * - createLinkToken: Initialize Plaid Link UI
 * - exchangePublicToken: Exchange token for access token
 * - fetchAccounts: Fetch and store account data
 * - syncTransactions: Cursor-based transaction sync
 * - fetchLiabilities: Fetch credit card liability data
 *
 * COMPONENT NOTE: All actions receive credentials as parameters.
 * No process.env access - the host app's client class provides config.
 */
/**
 * Create a link token for Plaid Link UI initialization.
 *
 * Link tokens are short-lived (30 minutes) and frontend-only.
 * The host app should call this before opening Plaid Link modal.
 */
export declare const createLinkToken: import("convex/server").RegisteredAction<"public", {
    products?: string[] | undefined;
    accountFilters?: any;
    countryCodes?: string[] | undefined;
    language?: string | undefined;
    clientName?: string | undefined;
    webhookUrl?: string | undefined;
    userId: string;
    plaidClientId: string;
    plaidSecret: string;
    plaidEnv: string;
}, Promise<{
    linkToken: string;
}>>;
/**
 * Exchange Plaid public token for access token and create plaidItem.
 *
 * Flow:
 * 1. Exchange public token with Plaid (~200ms)
 * 2. Fetch institution details
 * 3. Encrypt access token
 * 4. Create plaidItem in component database
 * 5. Return itemId and plaidItemId
 *
 * NOTE: Access token is NOT returned for security.
 */
export declare const exchangePublicToken: import("convex/server").RegisteredAction<"public", {
    products?: string[] | undefined;
    userId: string;
    plaidClientId: string;
    plaidSecret: string;
    plaidEnv: string;
    publicToken: string;
    encryptionKey: string;
}, Promise<{
    success: boolean;
    itemId: string;
    plaidItemId: string;
}>>;
/**
 * Fetch and store account data from Plaid.
 *
 * Flow:
 * 1. Get plaidItem and decrypt access token
 * 2. Fetch accounts from Plaid API
 * 3. Transform to component format (with milliunits)
 * 4. Bulk upsert accounts
 */
export declare const fetchAccounts: import("convex/server").RegisteredAction<"public", {
    plaidItemId: string;
    plaidClientId: string;
    plaidSecret: string;
    plaidEnv: string;
    encryptionKey: string;
}, Promise<{
    accountCount: number;
}>>;
/**
 * Sync transactions using cursor-based pagination with optimistic locking.
 *
 * CRITICAL FIX: Uses sync locking to prevent race conditions from concurrent syncs
 * (e.g., webhook + scheduled sync running simultaneously).
 *
 * Flow:
 * 1. Acquire sync lock (prevents concurrent syncs)
 * 2. Decrypt access token from lock result
 * 3. Fetch pages of transactions (with limits to prevent memory explosion)
 * 4. Bulk upsert transactions (added/modified/removed)
 * 5. Complete sync atomically (update cursor with version check)
 *
 * Pagination:
 * - Default: 10 pages max, 5000 transactions max per sync
 * - If hasMore=true, caller should schedule another sync
 *
 * Error Handling:
 * - Lock conflict: Returns immediately without error
 * - Auth error: Marks status as 'needs_reauth'
 * - Other error: Marks status as 'error'
 */
export declare const syncTransactions: import("convex/server").RegisteredAction<"public", {
    maxPages?: number | undefined;
    maxTransactions?: number | undefined;
    plaidItemId: string;
    plaidClientId: string;
    plaidSecret: string;
    plaidEnv: string;
    encryptionKey: string;
}, Promise<{
    added: number;
    modified: number;
    removed: number;
    cursor: string;
    hasMore: boolean;
    pagesProcessed: number;
    skipped?: boolean;
    skipReason?: string;
}>>;
/**
 * Fetch and store credit card liability data.
 *
 * Phase 1: Credit cards only.
 *
 * Flow:
 * 1. Get plaidItem and decrypt access token
 * 2. Fetch liabilities from Plaid API
 * 3. Upsert credit card liabilities (APR, balances, payments)
 */
export declare const fetchLiabilities: import("convex/server").RegisteredAction<"public", {
    plaidItemId: string;
    plaidClientId: string;
    plaidSecret: string;
    plaidEnv: string;
    encryptionKey: string;
}, Promise<{
    creditCards: number;
    mortgages: number;
    studentLoans: number;
}>>;
/**
 * Fetch and store recurring transaction streams from Plaid.
 *
 * Plaid's recurring detection API identifies:
 * - Subscriptions (Netflix, Spotify, etc.)
 * - Regular bills (rent, utilities, etc.)
 * - Recurring income (paychecks, deposits)
 *
 * Flow:
 * 1. Get plaidItem and decrypt access token
 * 2. Fetch recurring streams from Plaid API
 * 3. Transform to component format (with milliunits)
 * 4. Bulk upsert recurring streams
 */
export declare const fetchRecurringStreams: import("convex/server").RegisteredAction<"public", {
    plaidItemId: string;
    plaidClientId: string;
    plaidSecret: string;
    plaidEnv: string;
    encryptionKey: string;
}, Promise<{
    inflows: number;
    outflows: number;
}>>;
/**
 * Create an update link token for re-authentication.
 *
 * Used when a plaidItem is in 'needs_reauth' status.
 * Opens Plaid Link in update mode instead of creating a new connection.
 *
 * Flow:
 * 1. Get plaidItem and decrypt access token
 * 2. Create link token with access_token (update mode)
 * 3. Return link token for frontend
 */
export declare const createUpdateLinkToken: import("convex/server").RegisteredAction<"public", {
    mode?: "reauth" | "account_select" | undefined;
    plaidItemId: string;
    plaidClientId: string;
    plaidSecret: string;
    plaidEnv: string;
    encryptionKey: string;
}, Promise<{
    linkToken: string;
}>>;
/**
 * Complete re-authentication after user has gone through update Link flow.
 *
 * Unlike initial connection, update flow doesn't return a new public token.
 * We just need to mark the item as active again.
 */
export declare const completeReauth: import("convex/server").RegisteredAction<"public", {
    plaidItemId: string;
}, Promise<{
    success: boolean;
}>>;
/**
 * Enrich transactions with merchant data using Plaid Enrich API.
 *
 * Takes a batch of transactions and enriches them with:
 * - Counterparty name, type, and entity ID
 * - Merchant logo URL and website
 * - Confidence level
 *
 * Results are cached in merchantEnrichments table and linked to transactions.
 */
export declare const enrichTransactions: import("convex/server").RegisteredAction<"public", {
    transactions: {
        iso_currency_code?: string | undefined;
        mcc?: string | undefined;
        location?: {
            city?: string | undefined;
            region?: string | undefined;
            country?: string | undefined;
            postal_code?: string | undefined;
        } | undefined;
        id: string;
        amount: number;
        description: string;
        direction: "INFLOW" | "OUTFLOW";
    }[];
    plaidClientId: string;
    plaidSecret: string;
    plaidEnv: string;
    encryptionKey: string;
}, Promise<{
    enriched: number;
    failed: number;
}>>;
/**
 * Trigger a transactions refresh for a Plaid item.
 *
 * Forces Plaid to fetch the latest transactions from the financial institution.
 * This is useful when you need up-to-date data without waiting for webhooks.
 *
 * Note: Some institutions (e.g., Capital One) don't support this endpoint
 * and will return PRODUCTS_NOT_SUPPORTED.
 */
export declare const triggerTransactionsRefresh: import("convex/server").RegisteredAction<"public", {
    plaidItemId: string;
    plaidClientId: string;
    plaidSecret: string;
    plaidEnv: string;
    encryptionKey: string;
}, Promise<{
    success: boolean;
    requestId: string;
    error?: undefined;
} | {
    success: boolean;
    error: any;
    requestId?: undefined;
}>>;
//# sourceMappingURL=actions.d.ts.map