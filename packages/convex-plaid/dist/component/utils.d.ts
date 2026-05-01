/**
 * Plaid Component Utilities
 *
 * Contains:
 * - Plaid SDK client initialization
 * - Amount/currency conversion (milliunits)
 * - Transaction transformation helpers
 *
 * COMPONENT NOTE: All functions receive credentials as parameters,
 * not from process.env. This enables component isolation.
 */
import { PlaidApi, type Transaction, type RemovedTransaction } from "plaid";
export declare const DEFAULT_PLAID_PRODUCTS: readonly ["transactions", "liabilities"];
type ConfidenceLevel = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
type PlaidCounterparty = {
    name?: string | null;
    type?: string | null;
    logo_url?: string | null;
    website?: string | null;
    entity_id?: string | null;
    confidence_level?: string | null;
    phone_number?: string | null;
};
type TransactionMerchantEnrichment = {
    merchantId: string;
    merchantName: string;
    logoUrl?: string;
    categoryPrimary?: string;
    categoryDetailed?: string;
    categoryIconUrl?: string;
    website?: string;
    phoneNumber?: string;
    confidenceLevel: ConfidenceLevel;
};
/**
 * Initialize Plaid client with provided credentials.
 *
 * @param clientId - Plaid client ID
 * @param secret - Plaid secret key
 * @param env - Plaid environment: "sandbox" | "development" | "production"
 * @returns Initialized PlaidApi client
 */
export declare function initPlaidClient(clientId: string, secret: string, env: string): PlaidApi;
/**
 * Normalize the Plaid products this component needs for credit-card tracking.
 *
 * Transactions power balances/activity and liabilities power APR/payment data,
 * so both must be persisted on component items even when the host app omits
 * products during public-token exchange.
 */
export declare function normalizePlaidProducts(products?: string[]): string[];
/**
 * Convert dollar amount to milliunits (× 1000).
 * Avoids floating point precision errors by storing as integers.
 *
 * @param amount - Dollar amount from Plaid API
 * @returns Integer milliunits value
 */
export declare function convertAmountToMilliunits(amount: number): number;
/**
 * Convert milliunits back to dollars.
 *
 * @param milliunits - Stored milliunits value
 * @returns Dollar amount for display
 */
export declare function convertMilliunitsToDollars(milliunits: number): number;
/**
 * Pick the most likely merchant counterparty from a Plaid counterparties array.
 *
 * Resolution order:
 *   1. Filter to entries with `type === "merchant"` and `entity_id` set, then
 *      pick the highest `confidence_level`. Stable for equal confidences.
 *   2. If no merchant-typed entry exists, fall back to the first counterparty
 *      with any `entity_id` (e.g. marketplaces, processors).
 *   3. Otherwise return undefined.
 *
 * Plaid's payment-processor flows (Square, Stripe, DoorDash) often place the
 * processor at index 0 with the actual merchant later in the array, so a
 * blind `[0]` pick misses the merchant entirely.
 */
export declare function selectMerchantCounterparty(counterparties: PlaidCounterparty[] | null | undefined): PlaidCounterparty | undefined;
/**
 * Extract merchant enrichment fields that Plaid already returns from
 * /transactions/sync. This avoids a separate Enrich API call for Plaid-sourced
 * transactions while preserving the same normalized merchant storage model.
 */
export declare function extractTransactionMerchantEnrichment(txn: Transaction): TransactionMerchantEnrichment | undefined;
/**
 * Transform Plaid transaction to component storage format.
 *
 * @param txn - Raw Plaid Transaction object
 * @returns Transformed transaction data for storage
 */
export declare function transformTransaction(txn: Transaction): {
    accountId: string;
    transactionId: string;
    amount: number;
    isoCurrencyCode: string;
    date: string;
    datetime: string | undefined;
    name: string;
    merchantName: string | undefined;
    originalDescription: string | undefined;
    pending: boolean;
    pendingTransactionId: string | undefined;
    categoryPrimary: string | undefined;
    categoryDetailed: string | undefined;
    paymentChannel: import("plaid").TransactionPaymentChannelEnum;
} | {
    merchantId: string;
    enrichmentData: {
        counterpartyName: string;
        counterpartyType: string;
        counterpartyEntityId: string;
        counterpartyConfidence: ConfidenceLevel;
        counterpartyLogoUrl: string | undefined;
        counterpartyWebsite: string | undefined;
        counterpartyPhoneNumber: string | undefined;
        enrichedAt: number;
    };
    merchantEnrichment: TransactionMerchantEnrichment;
    accountId: string;
    transactionId: string;
    amount: number;
    isoCurrencyCode: string;
    date: string;
    datetime: string | undefined;
    name: string;
    merchantName: string | undefined;
    originalDescription: string | undefined;
    pending: boolean;
    pendingTransactionId: string | undefined;
    categoryPrimary: string | undefined;
    categoryDetailed: string | undefined;
    paymentChannel: import("plaid").TransactionPaymentChannelEnum;
};
/**
 * Account types Plaid `/transactions/enrich` accepts. Other Plaid account
 * subtypes (loan, investment, other) are rejected by the API.
 */
export type EnrichAccountType = "credit" | "depository";
/**
 * Single transaction in a `/transactions/enrich` request. The API requires
 * `account_type` to be a single value per request, so callers tag each
 * transaction with its source account type and the partition splits them
 * into one batch per type.
 */
export interface EnrichInputTransaction {
    id: string;
    description: string;
    amount: number;
    direction: "INFLOW" | "OUTFLOW";
    account_type: EnrichAccountType;
    iso_currency_code?: string;
    mcc?: string;
    location?: {
        city?: string;
        region?: string;
        postal_code?: string;
        country?: string;
    };
}
/**
 * Partition `/transactions/enrich` input into one batch per account_type.
 * Transactions with unsupported account types (e.g. "loan", "investment",
 * "other") land in `skipped` so the caller can log/report them rather than
 * sending an API call that would reject them.
 */
export declare function partitionEnrichmentInput(transactions: ReadonlyArray<EnrichInputTransaction & {
    account_type: string;
}>): {
    credit: EnrichInputTransaction[];
    depository: EnrichInputTransaction[];
    skipped: EnrichInputTransaction[];
};
/** Result from transaction sync pagination */
export interface TransactionSyncResult {
    added: Transaction[];
    modified: Transaction[];
    removed: RemovedTransaction[];
    nextCursor: string;
    hasMore: boolean;
    pagesProcessed: number;
}
/** Default pagination limits */
export declare const SYNC_PAGINATION_DEFAULTS: {
    readonly maxPages: 10;
    readonly maxTransactions: 5000;
};
/** Options for transaction sync pagination */
export interface SyncPaginationOptions {
    maxPages?: number;
    maxTransactions?: number;
}
/**
 * Sync transactions with cursor-based pagination.
 *
 * Fetches pages of transaction updates from Plaid with configurable limits.
 * Stops when:
 * - No more pages available (has_more = false)
 * - maxPages limit reached
 * - maxTransactions limit reached
 *
 * When stopped due to limits, hasMore=true signals that more syncs are needed.
 * Pure function - no side effects (caller handles storage).
 *
 * @param plaidClient - Initialized Plaid client
 * @param accessToken - Decrypted access token
 * @param cursor - Starting cursor (empty string for initial sync)
 * @param options - Pagination limits
 * @returns Accumulated transactions, cursor, and continuation status
 */
export declare function syncTransactionsPaginated(plaidClient: PlaidApi, accessToken: string, cursor?: string, options?: SyncPaginationOptions): Promise<TransactionSyncResult>;
/**
 * Split an array into equally-sized chunks (last chunk may be smaller).
 *
 * @param items - Array to chunk
 * @param chunkSize - Maximum size of each chunk
 * @returns Array of chunks
 */
export declare function chunkArray<T>(items: T[], chunkSize: number): T[][];
export {};
//# sourceMappingURL=utils.d.ts.map