/**
 * Plaid Component Private/Internal Functions
 *
 * Internal mutations and queries used by actions and webhooks.
 * These are NOT exposed to the host app directly.
 *
 * COMPONENT NOTE: Uses internalMutation/internalQuery for component isolation.
 */
/**
 * Get a plaidItem by its Convex document ID.
 * Returns the item with its encrypted access token.
 * Uses O(1) lookup via ctx.db.normalizeId() + ctx.db.get().
 */
export declare const getPlaidItem: import("convex/server").RegisteredQuery<"internal", {
    plaidItemId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"plaidItems">;
    userId: string;
    itemId: string;
    accessToken: string;
    cursor: string | undefined;
    institutionId: string | undefined;
    institutionName: string | undefined;
    status: "syncing" | "error" | "pending" | "active" | "needs_reauth" | "deleting";
    syncError: string | undefined;
    createdAt: number;
    lastSyncedAt: number | undefined;
    syncVersion: number | undefined;
    syncStartedAt: number | undefined;
} | null>>;
/**
 * Get a plaidItem by Plaid's item_id (for webhooks).
 */
export declare const getPlaidItemByItemId: import("convex/server").RegisteredQuery<"internal", {
    itemId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"plaidItems">;
    _creationTime: number;
    errorCode?: string | undefined;
    errorMessage?: string | undefined;
    cursor?: string | undefined;
    institutionId?: string | undefined;
    institutionName?: string | undefined;
    isActive?: boolean | undefined;
    syncError?: string | undefined;
    lastSyncedAt?: number | undefined;
    activatedAt?: number | undefined;
    errorAt?: number | undefined;
    reauthReason?: string | undefined;
    reauthAt?: number | undefined;
    disconnectedReason?: string | undefined;
    disconnectedAt?: number | undefined;
    syncVersion?: number | undefined;
    syncStartedAt?: number | undefined;
    circuitState?: "closed" | "open" | "half_open" | undefined;
    consecutiveFailures?: number | undefined;
    consecutiveSuccesses?: number | undefined;
    lastFailureAt?: number | undefined;
    nextRetryAt?: number | undefined;
    newAccountsAvailableAt?: number | undefined;
    firstErrorAt?: number | undefined;
    lastDispatchedAt?: number | undefined;
    status: "syncing" | "error" | "pending" | "active" | "needs_reauth" | "deleting";
    itemId: string;
    userId: string;
    accessToken: string;
    products: string[];
    createdAt: number;
} | null>>;
/**
 * Create a new plaidItem.
 * Returns the Convex document ID as a string.
 */
export declare const createPlaidItem: import("convex/server").RegisteredMutation<"internal", {
    institutionId?: string | undefined;
    institutionName?: string | undefined;
    isActive?: boolean | undefined;
    status: string;
    itemId: string;
    userId: string;
    accessToken: string;
    products: string[];
}, Promise<string>>;
/**
 * Update plaidItem status.
 * Uses O(1) lookup via ctx.db.normalizeId() + ctx.db.get().
 */
export declare const updateItemStatus: import("convex/server").RegisteredMutation<"internal", {
    syncError?: string | undefined;
    plaidItemId: string;
    status: string;
}, Promise<null>>;
/**
 * Update lastSyncedAt timestamp for a plaidItem.
 * Useful for sync operations that don't use cursors (e.g., fetchLiabilities).
 * Uses O(1) lookup via ctx.db.normalizeId() + ctx.db.get().
 */
export declare const updateLastSyncedAt: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
}, Promise<null>>;
/**
 * Update plaidItem cursor after successful sync.
 * Also marks as 'active' and updates lastSyncedAt.
 * Uses O(1) lookup via ctx.db.normalizeId() + ctx.db.get().
 */
export declare const updateItemCursor: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
    cursor: string;
}, Promise<null>>;
/**
 * Acquire a sync lock using optimistic locking.
 * Returns the new syncVersion if lock acquired, or null if another sync is in progress.
 *
 * This prevents race conditions where two concurrent syncs could:
 * - Both read the same cursor
 * - Both fetch duplicate transactions
 * - Race to update cursor state
 *
 * Uses O(1) lookup via ctx.db.normalizeId() + ctx.db.get().
 */
export declare const acquireSyncLock: import("convex/server").RegisteredMutation<"internal", {
    expectedVersion?: number | undefined;
    plaidItemId: string;
}, Promise<{
    acquired: false;
    reason: string;
    currentVersion?: undefined;
    syncStartedAt?: undefined;
    syncVersion?: undefined;
    cursor?: undefined;
    accessToken?: undefined;
    userId?: undefined;
} | {
    acquired: false;
    reason: string;
    currentVersion: number;
    syncStartedAt: number | undefined;
    syncVersion?: undefined;
    cursor?: undefined;
    accessToken?: undefined;
    userId?: undefined;
} | {
    acquired: true;
    syncVersion: number;
    cursor: string | undefined;
    accessToken: string;
    userId: string;
    reason?: undefined;
    currentVersion?: undefined;
    syncStartedAt?: undefined;
}>>;
/**
 * Complete a sync atomically: update cursor AND store the version we synced with.
 * Fails if another sync has taken over (version mismatch).
 *
 * Uses O(1) lookup via ctx.db.normalizeId() + ctx.db.get().
 */
export declare const completeSyncWithVersion: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
    cursor: string;
    syncVersion: number;
}, Promise<{
    success: boolean;
    reason: string;
} | {
    success: boolean;
    reason?: undefined;
}>>;
/**
 * Release sync lock on error without updating cursor.
 * Uses O(1) lookup via ctx.db.normalizeId() + ctx.db.get().
 *
 * W4: when transitioning into an error-class status ("error" or
 * "needs_reauth"), stamp the error-tracking fields the 6-hour persistent-
 * error cron filters on: `firstErrorAt` (monotonic; first-write-wins),
 * `errorAt = now`, and `errorCode` (from the optional arg, falling back
 * to a "SYNC_ERROR" sentinel so the cron can still emit a best-effort
 * dispatch with a visible label).
 */
export declare const releaseSyncLock: import("convex/server").RegisteredMutation<"internal", {
    errorCode?: string | undefined;
    syncError?: string | undefined;
    plaidItemId: string;
    status: string;
    syncVersion: number;
}, Promise<null>>;
/**
 * Mark plaidItem as needing re-authentication.
 * Used by webhook handlers.
 */
export declare const markNeedsReauth: import("convex/server").RegisteredMutation<"internal", {
    itemId: string;
    reason: string;
}, Promise<null>>;
/**
 * Set plaidItem error status.
 * Used by webhook handlers.
 */
export declare const setItemError: import("convex/server").RegisteredMutation<"internal", {
    itemId: string;
    errorCode: string;
    errorMessage: string;
}, Promise<null>>;
/**
 * Get plaidItem with circuit breaker fields.
 * Used by circuit breaker module.
 * Uses O(1) lookup via ctx.db.normalizeId() + ctx.db.get().
 */
export declare const getPlaidItemWithCircuit: import("convex/server").RegisteredQuery<"internal", {
    plaidItemId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"plaidItems">;
    circuitState: "closed" | "open" | "half_open" | undefined;
    consecutiveFailures: number | undefined;
    consecutiveSuccesses: number | undefined;
    lastFailureAt: number | undefined;
    nextRetryAt: number | undefined;
} | null>>;
/**
 * Update circuit breaker state for a plaidItem.
 * Uses O(1) lookup via ctx.db.normalizeId() + ctx.db.get().
 */
export declare const updateCircuitState: import("convex/server").RegisteredMutation<"internal", {
    circuitState?: "closed" | "open" | "half_open" | undefined;
    consecutiveFailures?: number | undefined;
    consecutiveSuccesses?: number | undefined;
    lastFailureAt?: number | undefined;
    nextRetryAt?: number | null | undefined;
    plaidItemId: string;
}, Promise<null>>;
/**
 * Reset circuit breaker to closed state.
 * Uses O(1) lookup via ctx.db.normalizeId() + ctx.db.get().
 */
export declare const resetCircuitBreaker: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
}, Promise<null>>;
/**
 * Bulk upsert accounts.
 * Creates new accounts or updates existing ones by accountId.
 *
 * Uses safe upsert pattern to handle TOCTOU race conditions where
 * concurrent calls might both try to insert the same account.
 */
export declare const bulkUpsertAccounts: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
    userId: string;
    accounts: {
        officialName?: string | undefined;
        mask?: string | undefined;
        subtype?: string | undefined;
        type: string;
        accountId: string;
        name: string;
        balances: {
            available?: number | undefined;
            current?: number | undefined;
            limit?: number | undefined;
            isoCurrencyCode: string;
        };
    }[];
}, Promise<{
    created: number;
    updated: number;
}>>;
/**
 * Bulk upsert transactions.
 * Handles added, modified, and removed transactions from sync.
 *
 * OPTIMIZATION: Uses batch query pattern to avoid N+1 queries.
 * Instead of querying for each modified/removed transaction individually,
 * we fetch all existing transactions for this item upfront and use a Map
 * for O(1) lookups. This reduces query count from O(n) to O(1).
 */
export declare const bulkUpsertTransactions: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
    userId: string;
    added: {
        datetime?: string | undefined;
        merchantName?: string | undefined;
        originalDescription?: string | undefined;
        pendingTransactionId?: string | undefined;
        categoryPrimary?: string | undefined;
        categoryDetailed?: string | undefined;
        paymentChannel?: string | undefined;
        merchantId?: string | undefined;
        enrichmentData?: {
            counterpartyName?: string | undefined;
            counterpartyType?: string | undefined;
            counterpartyEntityId?: string | undefined;
            counterpartyConfidence?: string | undefined;
            counterpartyLogoUrl?: string | undefined;
            counterpartyWebsite?: string | undefined;
            counterpartyPhoneNumber?: string | undefined;
            enrichedAt?: number | undefined;
        } | undefined;
        merchantEnrichment?: {
            categoryPrimary?: string | undefined;
            categoryDetailed?: string | undefined;
            logoUrl?: string | undefined;
            categoryIconUrl?: string | undefined;
            website?: string | undefined;
            phoneNumber?: string | undefined;
            merchantName: string;
            merchantId: string;
            confidenceLevel: "UNKNOWN" | "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";
        } | undefined;
        pending: boolean;
        accountId: string;
        name: string;
        isoCurrencyCode: string;
        transactionId: string;
        amount: number;
        date: string;
    }[];
    modified: {
        datetime?: string | undefined;
        merchantName?: string | undefined;
        originalDescription?: string | undefined;
        pendingTransactionId?: string | undefined;
        categoryPrimary?: string | undefined;
        categoryDetailed?: string | undefined;
        paymentChannel?: string | undefined;
        merchantId?: string | undefined;
        enrichmentData?: {
            counterpartyName?: string | undefined;
            counterpartyType?: string | undefined;
            counterpartyEntityId?: string | undefined;
            counterpartyConfidence?: string | undefined;
            counterpartyLogoUrl?: string | undefined;
            counterpartyWebsite?: string | undefined;
            counterpartyPhoneNumber?: string | undefined;
            enrichedAt?: number | undefined;
        } | undefined;
        merchantEnrichment?: {
            categoryPrimary?: string | undefined;
            categoryDetailed?: string | undefined;
            logoUrl?: string | undefined;
            categoryIconUrl?: string | undefined;
            website?: string | undefined;
            phoneNumber?: string | undefined;
            merchantName: string;
            merchantId: string;
            confidenceLevel: "UNKNOWN" | "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";
        } | undefined;
        pending: boolean;
        accountId: string;
        name: string;
        isoCurrencyCode: string;
        transactionId: string;
        amount: number;
        date: string;
    }[];
    removed: string[];
}, Promise<{
    added: number;
    modified: number;
    removed: number;
}>>;
/**
 * Backfill merchant enrichment fields for existing transaction rows.
 *
 * This intentionally does not insert missing transactions or touch item cursors.
 * It is meant for one-time recovery when historical transactions were synced
 * before merchant/logo fields were persisted.
 */
export declare const backfillTransactionEnrichments: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
    transactions: {
        datetime?: string | undefined;
        merchantName?: string | undefined;
        originalDescription?: string | undefined;
        pendingTransactionId?: string | undefined;
        categoryPrimary?: string | undefined;
        categoryDetailed?: string | undefined;
        paymentChannel?: string | undefined;
        merchantId?: string | undefined;
        enrichmentData?: {
            counterpartyName?: string | undefined;
            counterpartyType?: string | undefined;
            counterpartyEntityId?: string | undefined;
            counterpartyConfidence?: string | undefined;
            counterpartyLogoUrl?: string | undefined;
            counterpartyWebsite?: string | undefined;
            counterpartyPhoneNumber?: string | undefined;
            enrichedAt?: number | undefined;
        } | undefined;
        merchantEnrichment?: {
            categoryPrimary?: string | undefined;
            categoryDetailed?: string | undefined;
            logoUrl?: string | undefined;
            categoryIconUrl?: string | undefined;
            website?: string | undefined;
            phoneNumber?: string | undefined;
            merchantName: string;
            merchantId: string;
            confidenceLevel: "UNKNOWN" | "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";
        } | undefined;
        pending: boolean;
        accountId: string;
        name: string;
        isoCurrencyCode: string;
        transactionId: string;
        amount: number;
        date: string;
    }[];
}, Promise<{
    scanned: number;
    matched: number;
    updated: number;
    merchantsUpserted: number;
}>>;
/**
 * Upsert credit card liability.
 * Creates or updates by accountId.
 *
 * Uses safe upsert pattern to handle TOCTOU race conditions where
 * concurrent calls might both try to insert the same liability.
 */
export declare const upsertCreditCardLiability: import("convex/server").RegisteredMutation<"internal", {
    lastPaymentAmount?: number | undefined;
    lastPaymentDate?: string | undefined;
    lastStatementBalance?: number | undefined;
    lastStatementIssueDate?: string | undefined;
    minimumPaymentAmount?: number | undefined;
    nextPaymentDueDate?: string | undefined;
    plaidItemId: string;
    userId: string;
    accountId: string;
    aprs: {
        balanceSubjectToApr?: number | undefined;
        interestChargeAmount?: number | undefined;
        aprPercentage: number;
        aprType: string;
    }[];
    isOverdue: boolean;
}, Promise<string>>;
/**
 * Bulk upsert credit card liabilities.
 * Creates or updates by accountId in a single mutation.
 * Uses safe upsert pattern to handle TOCTOU race conditions.
 */
export declare const bulkUpsertCreditCardLiabilities: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
    userId: string;
    creditCards: {
        lastPaymentAmount?: number | undefined;
        lastPaymentDate?: string | undefined;
        lastStatementBalance?: number | undefined;
        lastStatementIssueDate?: string | undefined;
        minimumPaymentAmount?: number | undefined;
        nextPaymentDueDate?: string | undefined;
        accountId: string;
        aprs: {
            balanceSubjectToApr?: number | undefined;
            interestChargeAmount?: number | undefined;
            aprPercentage: number;
            aprType: string;
        }[];
        isOverdue: boolean;
    }[];
}, Promise<{
    created: number;
    updated: number;
}>>;
/**
 * Schedule a sync operation (placeholder for Phase 2).
 * In Phase 2, this would schedule a background job.
 */
export declare const scheduleSync: import("convex/server").RegisteredMutation<"internal", {
    itemId: string;
    syncType: string;
}, Promise<null>>;
/**
 * Deactivate a plaidItem (for USER_PERMISSION_REVOKED webhook).
 * Marks item as inactive but keeps data for audit trail.
 */
export declare const deactivateItem: import("convex/server").RegisteredMutation<"internal", {
    itemId: string;
    reason: string;
}, Promise<null>>;
/**
 * Recursively delete data associated with a plaidItem in batches.
 *
 * This is the worker mutation scheduled by deletePlaidItem.
 * It deletes data in configurable batch sizes to avoid mutation timeouts.
 * If more data remains after a batch, it schedules itself to continue.
 *
 * Deletion order:
 * 1. Transactions (usually largest collection)
 * 2. Accounts
 * 3. Credit card liabilities
 * 4. Mortgage liabilities
 * 5. Student loan liabilities
 * 6. Recurring streams
 * 7. The plaidItem itself (final step)
 */
export declare const cleanupDeletedItem: import("convex/server").RegisteredMutation<"internal", {
    batchSize?: number | undefined;
    plaidItemId: string;
}, Promise<{
    status: "in_progress";
    deleted: number;
    collection: string;
} | {
    status: "complete";
    deleted: number;
    collection?: undefined;
}>>;
/**
 * Get all active plaidItems for scheduled sync.
 * Returns items that are in 'active' status.
 */
export declare const getAllActiveItems: import("convex/server").RegisteredQuery<"internal", {}, Promise<{
    _id: string;
    userId: string;
    itemId: string;
    accessToken: string;
    cursor: string | undefined;
    lastSyncedAt: number | undefined;
}[]>>;
/**
 * Get items that need sync (haven't synced in specified hours).
 */
export declare const getItemsNeedingSync: import("convex/server").RegisteredQuery<"internal", {
    maxAgeHours?: number | undefined;
}, Promise<{
    _id: string;
    userId: string;
    itemId: string;
    accessToken: string;
    cursor: string | undefined;
    lastSyncedAt: number | undefined;
}[]>>;
/**
 * Get a single item by ID with its access token.
 * Used by syncSingleItem to fetch item details for fan-out sync.
 */
export declare const getItemWithToken: import("convex/server").RegisteredQuery<"internal", {
    plaidItemId: string;
}, Promise<{
    _id: string;
    userId: string;
    itemId: string;
    accessToken: string;
    cursor: string | undefined;
    lastSyncedAt: number | undefined;
} | null>>;
/**
 * Bulk upsert recurring streams.
 * Creates or updates by streamId.
 *
 * Uses safe upsert pattern to handle TOCTOU race conditions where
 * concurrent calls might both try to insert the same stream.
 */
export declare const bulkUpsertRecurringStreams: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
    userId: string;
    streams: {
        merchantName?: string | undefined;
        category?: string | undefined;
        firstDate?: string | undefined;
        lastDate?: string | undefined;
        predictedNextDate?: string | undefined;
        status: "MATURE" | "EARLY_DETECTION" | "TOMBSTONED";
        type: "inflow" | "outflow";
        isActive: boolean;
        accountId: string;
        isoCurrencyCode: string;
        streamId: string;
        description: string;
        averageAmount: number;
        lastAmount: number;
        frequency: string;
    }[];
}, Promise<{
    created: number;
    updated: number;
}>>;
/**
 * Mark streams as tombstoned for a plaidItem.
 * Used when streams are removed during sync.
 */
export declare const tombstoneStreams: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
    streamIds: string[];
}, Promise<{
    tombstoned: number;
}>>;
/**
 * Upsert mortgage liability by accountId.
 *
 * Uses safe upsert pattern to handle TOCTOU race conditions where
 * concurrent calls might both try to insert the same liability.
 */
export declare const upsertMortgageLiability: import("convex/server").RegisteredMutation<"internal", {
    lastPaymentAmount?: number | undefined;
    lastPaymentDate?: string | undefined;
    nextPaymentDueDate?: string | undefined;
    accountNumber?: string | undefined;
    loanTerm?: string | undefined;
    loanTypeDescription?: string | undefined;
    originationDate?: string | undefined;
    maturityDate?: string | undefined;
    interestRateType?: string | undefined;
    nextMonthlyPayment?: number | undefined;
    originationPrincipalAmount?: number | undefined;
    currentLateFee?: number | undefined;
    escrowBalance?: number | undefined;
    pastDueAmount?: number | undefined;
    ytdInterestPaid?: number | undefined;
    ytdPrincipalPaid?: number | undefined;
    hasPmi?: boolean | undefined;
    hasPrepaymentPenalty?: boolean | undefined;
    propertyAddress?: {
        street?: string | undefined;
        city?: string | undefined;
        region?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    plaidItemId: string;
    userId: string;
    accountId: string;
    interestRatePercentage: number;
}, Promise<string>>;
/**
 * Bulk upsert mortgage liabilities.
 * Creates or updates by accountId in a single mutation.
 * Uses safe upsert pattern to handle TOCTOU race conditions.
 */
export declare const bulkUpsertMortgageLiabilities: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
    userId: string;
    mortgages: {
        lastPaymentAmount?: number | undefined;
        lastPaymentDate?: string | undefined;
        nextPaymentDueDate?: string | undefined;
        accountNumber?: string | undefined;
        loanTerm?: string | undefined;
        loanTypeDescription?: string | undefined;
        originationDate?: string | undefined;
        maturityDate?: string | undefined;
        interestRateType?: string | undefined;
        nextMonthlyPayment?: number | undefined;
        originationPrincipalAmount?: number | undefined;
        currentLateFee?: number | undefined;
        escrowBalance?: number | undefined;
        pastDueAmount?: number | undefined;
        ytdInterestPaid?: number | undefined;
        ytdPrincipalPaid?: number | undefined;
        hasPmi?: boolean | undefined;
        hasPrepaymentPenalty?: boolean | undefined;
        propertyAddress?: {
            street?: string | undefined;
            city?: string | undefined;
            region?: string | undefined;
            postalCode?: string | undefined;
            country?: string | undefined;
        } | undefined;
        accountId: string;
        interestRatePercentage: number;
    }[];
}, Promise<{
    created: number;
    updated: number;
}>>;
/**
 * Upsert student loan liability by accountId.
 *
 * Uses safe upsert pattern to handle TOCTOU race conditions where
 * concurrent calls might both try to insert the same liability.
 */
export declare const upsertStudentLoanLiability: import("convex/server").RegisteredMutation<"internal", {
    isOverdue?: boolean | undefined;
    lastPaymentAmount?: number | undefined;
    lastPaymentDate?: string | undefined;
    lastStatementBalance?: number | undefined;
    lastStatementIssueDate?: string | undefined;
    minimumPaymentAmount?: number | undefined;
    nextPaymentDueDate?: string | undefined;
    accountNumber?: string | undefined;
    originationDate?: string | undefined;
    originationPrincipalAmount?: number | undefined;
    ytdInterestPaid?: number | undefined;
    ytdPrincipalPaid?: number | undefined;
    loanName?: string | undefined;
    guarantor?: string | undefined;
    sequenceNumber?: string | undefined;
    disbursementDates?: string[] | undefined;
    expectedPayoffDate?: string | undefined;
    paymentReferenceNumber?: string | undefined;
    outstandingInterestAmount?: number | undefined;
    loanStatus?: {
        type?: string | undefined;
        endDate?: string | undefined;
    } | undefined;
    repaymentPlan?: {
        type?: string | undefined;
        description?: string | undefined;
    } | undefined;
    servicerAddress?: {
        street?: string | undefined;
        city?: string | undefined;
        region?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    plaidItemId: string;
    userId: string;
    accountId: string;
    interestRatePercentage: number;
}, Promise<string>>;
/**
 * Bulk upsert student loan liabilities.
 * Creates or updates by accountId in a single mutation.
 * Uses safe upsert pattern to handle TOCTOU race conditions.
 */
export declare const bulkUpsertStudentLoanLiabilities: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
    userId: string;
    studentLoans: {
        isOverdue?: boolean | undefined;
        lastPaymentAmount?: number | undefined;
        lastPaymentDate?: string | undefined;
        lastStatementBalance?: number | undefined;
        lastStatementIssueDate?: string | undefined;
        minimumPaymentAmount?: number | undefined;
        nextPaymentDueDate?: string | undefined;
        accountNumber?: string | undefined;
        originationDate?: string | undefined;
        originationPrincipalAmount?: number | undefined;
        ytdInterestPaid?: number | undefined;
        ytdPrincipalPaid?: number | undefined;
        loanName?: string | undefined;
        guarantor?: string | undefined;
        sequenceNumber?: string | undefined;
        disbursementDates?: string[] | undefined;
        expectedPayoffDate?: string | undefined;
        paymentReferenceNumber?: string | undefined;
        outstandingInterestAmount?: number | undefined;
        loanStatus?: {
            type?: string | undefined;
            endDate?: string | undefined;
        } | undefined;
        repaymentPlan?: {
            type?: string | undefined;
            description?: string | undefined;
        } | undefined;
        servicerAddress?: {
            street?: string | undefined;
            city?: string | undefined;
            region?: string | undefined;
            postalCode?: string | undefined;
            country?: string | undefined;
        } | undefined;
        accountId: string;
        interestRatePercentage: number;
    }[];
}, Promise<{
    created: number;
    updated: number;
}>>;
/**
 * Upsert merchant enrichment by merchantId.
 * Shared across all users.
 *
 * Uses safe upsert pattern to handle TOCTOU race conditions where
 * concurrent calls might both try to insert the same merchant enrichment.
 */
export declare const upsertMerchantEnrichment: import("convex/server").RegisteredMutation<"internal", {
    categoryPrimary?: string | undefined;
    categoryDetailed?: string | undefined;
    logoUrl?: string | undefined;
    categoryIconUrl?: string | undefined;
    website?: string | undefined;
    phoneNumber?: string | undefined;
    merchantName: string;
    merchantId: string;
    confidenceLevel: "UNKNOWN" | "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";
}, Promise<string>>;
/**
 * Link transaction to merchant by updating merchantId field.
 */
export declare const linkTransactionToMerchant: import("convex/server").RegisteredMutation<"internal", {
    transactionId: string;
    merchantId: string;
}, Promise<boolean>>;
/**
 * Update transaction with enrichment data.
 */
export declare const updateTransactionEnrichment: import("convex/server").RegisteredMutation<"internal", {
    merchantId?: string | undefined;
    transactionId: string;
    enrichmentData: {
        counterpartyName?: string | undefined;
        counterpartyType?: string | undefined;
        counterpartyEntityId?: string | undefined;
        counterpartyConfidence?: string | undefined;
        counterpartyLogoUrl?: string | undefined;
        counterpartyWebsite?: string | undefined;
        counterpartyPhoneNumber?: string | undefined;
        enrichedAt?: number | undefined;
    };
}, Promise<boolean>>;
/**
 * Create a webhook log entry.
 */
export declare const createWebhookLog: import("convex/server").RegisteredMutation<"internal", {
    errorMessage?: string | undefined;
    scheduledFunctionId?: string | undefined;
    status: "received" | "processing" | "processed" | "duplicate" | "failed";
    itemId: string;
    webhookId: string;
    webhookType: string;
    webhookCode: string;
    bodyHash: string;
    receivedAt: number;
}, Promise<string>>;
/**
 * Update webhook log status.
 * Uses O(1) lookup via ctx.db.normalizeId() + ctx.db.get().
 */
export declare const updateWebhookLogStatus: import("convex/server").RegisteredMutation<"internal", {
    errorMessage?: string | undefined;
    processedAt?: number | undefined;
    scheduledFunctionId?: string | undefined;
    status: "received" | "processing" | "processed" | "duplicate" | "failed";
    webhookLogId: string;
}, Promise<null>>;
/**
 * Find recent webhook by body hash (for deduplication).
 */
export declare const findRecentByHash: import("convex/server").RegisteredQuery<"internal", {
    bodyHash: string;
    windowMs: number;
}, Promise<{
    _id: string;
    webhookId: string;
    status: "received" | "processing" | "processed" | "duplicate" | "failed";
    receivedAt: number;
} | null>>;
/**
 * Prune old webhook logs to prevent table growth.
 *
 * Deletes logs older than the specified retention period (default: 24 hours).
 * Call this from a scheduled function (cron) to keep the table size manageable.
 *
 * Example cron setup in host app:
 * ```typescript
 * // convex/crons.ts
 * import { cronJobs } from "convex/server";
 * import { components } from "./_generated/api";
 *
 * const crons = cronJobs();
 * crons.hourly("prune-webhook-logs", { minuteUTC: 0 }, components.plaid.private.pruneOldWebhookLogs);
 * export default crons;
 * ```
 */
export declare const pruneOldWebhookLogs: import("convex/server").RegisteredMutation<"internal", {
    batchSize?: number | undefined;
    retentionMs?: number | undefined;
}, Promise<{
    deleted: number;
    hasMore: boolean;
}>>;
/**
 * Create a sync log entry when sync starts.
 * Returns the sync log ID for later completion.
 */
export declare const createSyncLog: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
    userId: string;
    syncType: "transactions" | "liabilities" | "recurring" | "accounts" | "onboard";
    trigger: "onboard" | "webhook" | "scheduled" | "manual";
}, Promise<string>>;
/**
 * Complete a sync log with success status.
 * Uses O(1) lookup via ctx.db.normalizeId() + ctx.db.get().
 */
export declare const completeSyncLogSuccess: import("convex/server").RegisteredMutation<"internal", {
    result?: {
        transactionsAdded?: number | undefined;
        transactionsModified?: number | undefined;
        transactionsRemoved?: number | undefined;
        accountsUpdated?: number | undefined;
        streamsUpdated?: number | undefined;
        creditCardsUpdated?: number | undefined;
        mortgagesUpdated?: number | undefined;
        studentLoansUpdated?: number | undefined;
    } | undefined;
    syncLogId: string;
}, Promise<null>>;
/**
 * Complete a sync log with error status.
 * Uses O(1) lookup via ctx.db.normalizeId() + ctx.db.get().
 */
export declare const completeSyncLogError: import("convex/server").RegisteredMutation<"internal", {
    status?: "error" | "started" | "success" | "rate_limited" | "circuit_open" | undefined;
    errorCode?: string | undefined;
    errorMessage?: string | undefined;
    syncLogId: string;
}, Promise<null>>;
/**
 * Prune old sync logs to prevent table growth.
 *
 * Deletes logs older than the specified retention period (default: 90 days).
 * Call this from a scheduled function (cron) to keep the table size manageable.
 *
 * Example cron setup in host app:
 * ```typescript
 * // convex/crons.ts
 * crons.daily("prune-sync-logs", { hourUTC: 3, minuteUTC: 30 }, components.plaid.private.pruneOldSyncLogs);
 * ```
 */
export declare const pruneOldSyncLogs: import("convex/server").RegisteredMutation<"internal", {
    batchSize?: number | undefined;
    retentionMs?: number | undefined;
}, Promise<{
    deleted: number;
    hasMore: boolean;
}>>;
/**
 * Get institution by institutionId (internal query).
 */
export declare const getInstitutionInternal: import("convex/server").RegisteredQuery<"internal", {
    institutionId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"plaidInstitutions">;
    institutionId: string;
    name: string;
    logo: string | undefined;
    primaryColor: string | undefined;
    url: string | undefined;
    products: string[] | undefined;
    lastFetched: number;
} | null>>;
/**
 * Upsert institution metadata.
 * Creates or updates by institutionId.
 *
 * Uses safe upsert pattern to handle TOCTOU race conditions where
 * concurrent calls might both try to insert the same institution.
 */
export declare const upsertInstitution: import("convex/server").RegisteredMutation<"internal", {
    products?: string[] | undefined;
    logo?: string | undefined;
    primaryColor?: string | undefined;
    url?: string | undefined;
    institutionId: string;
    name: string;
}, Promise<string>>;
/**
 * Stamp plaidItems.newAccountsAvailableAt with the current timestamp.
 * Called by the ITEM:NEW_ACCOUNTS_AVAILABLE webhook handler.
 * Idempotent: writing the timestamp twice has no functional effect.
 */
export declare const setNewAccountsAvailableInternal: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
}, Promise<null>>;
/**
 * Clear plaidItems.newAccountsAvailableAt.
 * Called exactly once per flow: after a successful update-mode exchangePublicToken
 * for an existing plaidItemId.
 */
export declare const clearNewAccountsAvailableInternal: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
}, Promise<null>>;
/**
 * Stamp plaidItems.firstErrorAt if not already set (first-write-wins).
 * Called before the status patch on transition into error or needs_reauth.
 * Keeps the error-transition clock monotonic across repeated error observations.
 */
export declare const markFirstErrorAtInternal: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
}, Promise<null>>;
/**
 * Clear plaidItems.firstErrorAt and plaidItems.lastDispatchedAt.
 * Called on transition from error-class status back to active via
 * completeReauthAction or a successful sync.
 */
export declare const clearErrorTrackingInternal: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
}, Promise<null>>;
/**
 * Stamp plaidItems.lastDispatchedAt.
 * Called by the 6-hour persistent-error cron immediately after scheduling
 * dispatchItemErrorPersistent. Used as the cron's dedup filter.
 */
export declare const markItemErrorDispatchedInternal: import("convex/server").RegisteredMutation<"internal", {
    plaidItemId: string;
}, Promise<null>>;
/**
 * List plaidItems in error status that:
 *   - have lastSyncedAt older than olderThanLastSyncedAt (or undefined)
 *   - have lastDispatchedAt older than dispatchedBefore (or undefined)
 *
 * Used by the host-app 6-hour persistent-error cron per W4 spec §8.2.
 * Returns a subset payload (not the full plaidItem doc) to cap component-
 * boundary surface area.
 */
export declare const listErrorItemsInternal: import("convex/server").RegisteredQuery<"internal", {
    olderThanLastSyncedAt: number;
    dispatchedBefore: number;
}, Promise<{
    plaidItemId: string;
    userId: string;
    institutionName: string | null;
    firstErrorAt: number | null;
    errorAt: number | null;
    errorCode: string | null;
}[]>>;
//# sourceMappingURL=private.d.ts.map