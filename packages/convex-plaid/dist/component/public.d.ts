/**
 * Plaid Component Public API
 *
 * Queries and mutations exposed to the host app.
 * These are the primary way host apps interact with component data.
 *
 * COMPONENT NOTE: All IDs returned as strings for component boundary.
 * Security: accessToken is NEVER exposed in query results.
 */
/**
 * Get all plaidItems for a user.
 *
 * @security Components cannot access ctx.auth. Host apps must validate userId
 * before calling this query.
 * NOTE: accessToken is excluded for security.
 */
export declare const getItemsByUser: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: string;
    _creationTime: number;
    userId: string;
    itemId: string;
    institutionId: string | undefined;
    institutionName: string | undefined;
    products: string[];
    isActive: boolean | undefined;
    status: "error" | "pending" | "syncing" | "active" | "needs_reauth" | "deleting";
    syncError: string | undefined;
    createdAt: number;
    lastSyncedAt: number | undefined;
    activatedAt: number | undefined;
    errorCode: string | undefined;
    errorMessage: string | undefined;
    errorAt: number | undefined;
    reauthReason: string | undefined;
    reauthAt: number | undefined;
    disconnectedReason: string | undefined;
    disconnectedAt: number | undefined;
    circuitState: "closed" | "open" | "half_open" | undefined;
    consecutiveFailures: number | undefined;
    lastFailureAt: number | undefined;
    nextRetryAt: number | undefined;
    newAccountsAvailableAt: number | undefined;
    firstErrorAt: number | undefined;
    lastDispatchedAt: number | undefined;
}[]>>;
/**
 * Get a single plaidItem by component document ID.
 *
 * @security Components cannot access ctx.auth. Host apps must verify the caller
 * owns this item before returning data.
 * NOTE: accessToken is excluded for security.
 */
export declare const getItem: import("convex/server").RegisteredQuery<"public", {
    plaidItemId: string;
}, Promise<{
    _id: string;
    _creationTime: number;
    userId: string;
    itemId: string;
    institutionId: string | undefined;
    institutionName: string | undefined;
    products: string[];
    isActive: boolean | undefined;
    status: "error" | "pending" | "syncing" | "active" | "needs_reauth" | "deleting";
    syncError: string | undefined;
    createdAt: number;
    lastSyncedAt: number | undefined;
    activatedAt: number | undefined;
    errorCode: string | undefined;
    errorMessage: string | undefined;
    errorAt: number | undefined;
    reauthReason: string | undefined;
    reauthAt: number | undefined;
    disconnectedReason: string | undefined;
    disconnectedAt: number | undefined;
    circuitState: "closed" | "open" | "half_open" | undefined;
    consecutiveFailures: number | undefined;
    lastFailureAt: number | undefined;
    nextRetryAt: number | undefined;
    newAccountsAvailableAt: number | undefined;
    firstErrorAt: number | undefined;
    lastDispatchedAt: number | undefined;
} | null>>;
/**
 * Get a single plaidItem by Plaid's item_id.
 * Used by webhook handlers to look up items by Plaid's identifier.
 *
 * @security Components cannot access ctx.auth. Host apps must not expose this
 * query directly to clients.
 * NOTE: accessToken is excluded for security.
 */
export declare const getItemByPlaidItemId: import("convex/server").RegisteredQuery<"public", {
    itemId: string;
}, Promise<{
    _id: string;
    _creationTime: number;
    userId: string;
    itemId: string;
    institutionId: string | undefined;
    institutionName: string | undefined;
    products: string[];
    isActive: boolean | undefined;
    status: "error" | "pending" | "syncing" | "active" | "needs_reauth" | "deleting";
    syncError: string | undefined;
    createdAt: number;
    lastSyncedAt: number | undefined;
    activatedAt: number | undefined;
    errorCode: string | undefined;
    errorMessage: string | undefined;
    errorAt: number | undefined;
    reauthReason: string | undefined;
    reauthAt: number | undefined;
    disconnectedReason: string | undefined;
    disconnectedAt: number | undefined;
    circuitState: "closed" | "open" | "half_open" | undefined;
    consecutiveFailures: number | undefined;
    lastFailureAt: number | undefined;
    nextRetryAt: number | undefined;
    newAccountsAvailableAt: number | undefined;
    firstErrorAt: number | undefined;
    lastDispatchedAt: number | undefined;
} | null>>;
/**
 * Get all active plaidItems across all users.
 * Used by scheduled sync jobs to find items that need syncing.
 *
 * @security Returns data for all users. Only call from trusted server-side code.
 * NOTE: accessToken is excluded for security.
 */
export declare const getAllActiveItems: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: string;
    _creationTime: number;
    userId: string;
    itemId: string;
    institutionId: string | undefined;
    institutionName: string | undefined;
    products: string[];
    isActive: boolean | undefined;
    status: "error" | "pending" | "syncing" | "active" | "needs_reauth" | "deleting";
    syncError: string | undefined;
    createdAt: number;
    lastSyncedAt: number | undefined;
    activatedAt: number | undefined;
    errorCode: string | undefined;
    errorMessage: string | undefined;
    errorAt: number | undefined;
    reauthReason: string | undefined;
    reauthAt: number | undefined;
    disconnectedReason: string | undefined;
    disconnectedAt: number | undefined;
    circuitState: "closed" | "open" | "half_open" | undefined;
    consecutiveFailures: number | undefined;
    lastFailureAt: number | undefined;
    nextRetryAt: number | undefined;
    newAccountsAvailableAt: number | undefined;
    firstErrorAt: number | undefined;
    lastDispatchedAt: number | undefined;
}[]>>;
/**
 * Get all accounts for a user.
 *
 * @security Components cannot access ctx.auth. Host apps must validate userId
 * before calling this query.
 */
export declare const getAccountsByUser: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: string;
    userId: string;
    plaidItemId: string;
    accountId: string;
    name: string;
    officialName: string | undefined;
    mask: string | undefined;
    type: string;
    subtype: string | undefined;
    balances: {
        limit?: number | undefined;
        available?: number | undefined;
        current?: number | undefined;
        isoCurrencyCode: string;
    };
    createdAt: number;
}[]>>;
/**
 * Get all accounts for a specific plaidItem.
 *
 * @security Components cannot access ctx.auth. Host apps must verify ownership
 * of the plaidItem before calling this query.
 */
export declare const getAccountsByItem: import("convex/server").RegisteredQuery<"public", {
    plaidItemId: string;
}, Promise<{
    _id: string;
    userId: string;
    plaidItemId: string;
    accountId: string;
    name: string;
    officialName: string | undefined;
    mask: string | undefined;
    type: string;
    subtype: string | undefined;
    balances: {
        limit?: number | undefined;
        available?: number | undefined;
        current?: number | undefined;
        isoCurrencyCode: string;
    };
    createdAt: number;
}[]>>;
/**
 * Get transactions for a specific account.
 * Returns most recent first.
 */
/**
 * Get transactions for a specific account.
 *
 * @security Components cannot access ctx.auth. Host apps must verify ownership
 * of the account before calling this query.
 */
export declare const getTransactionsByAccount: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    accountId: string;
}, Promise<{
    _id: string;
    userId: string;
    plaidItemId: string;
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
    categoryPrimary: string | undefined;
    categoryDetailed: string | undefined;
    enrichmentData: {
        counterpartyName?: string | undefined;
        counterpartyType?: string | undefined;
        counterpartyEntityId?: string | undefined;
        counterpartyConfidence?: string | undefined;
        counterpartyLogoUrl?: string | undefined;
        counterpartyWebsite?: string | undefined;
        counterpartyPhoneNumber?: string | undefined;
        enrichedAt?: number | undefined;
    } | undefined;
    merchantId: string | undefined;
    createdAt: number;
}[]>>;
/**
 * Get transactions for a user with date range filtering.
 *
 * @security Components cannot access ctx.auth. Host apps must validate userId
 * before calling this query.
 */
export declare const getTransactionsByUser: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    endDate?: string | undefined;
    startDate?: string | undefined;
    userId: string;
}, Promise<{
    _id: string;
    userId: string;
    plaidItemId: string;
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
    categoryPrimary: string | undefined;
    categoryDetailed: string | undefined;
    enrichmentData: {
        counterpartyName?: string | undefined;
        counterpartyType?: string | undefined;
        counterpartyEntityId?: string | undefined;
        counterpartyConfidence?: string | undefined;
        counterpartyLogoUrl?: string | undefined;
        counterpartyWebsite?: string | undefined;
        counterpartyPhoneNumber?: string | undefined;
        enrichedAt?: number | undefined;
    } | undefined;
    merchantId: string | undefined;
    createdAt: number;
}[]>>;
/**
 * Get credit card liabilities for a specific plaidItem.
 *
 * @security Components cannot access ctx.auth. Host apps must verify ownership
 * of the plaidItem before calling this query.
 */
export declare const getLiabilitiesByItem: import("convex/server").RegisteredQuery<"public", {
    plaidItemId: string;
}, Promise<{
    _id: string;
    userId: string;
    plaidItemId: string;
    accountId: string;
    aprs: {
        balanceSubjectToApr?: number | undefined;
        interestChargeAmount?: number | undefined;
        aprPercentage: number;
        aprType: string;
    }[];
    isOverdue: boolean;
    lastPaymentAmount: number | undefined;
    lastPaymentDate: string | undefined;
    lastStatementBalance: number | undefined;
    lastStatementIssueDate: string | undefined;
    minimumPaymentAmount: number | undefined;
    nextPaymentDueDate: string | undefined;
    createdAt: number;
    updatedAt: number;
}[]>>;
/**
 * Get all credit card liabilities for a user.
 *
 * @security Components cannot access ctx.auth. Host apps must validate userId
 * before calling this query.
 */
export declare const getLiabilitiesByUser: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: string;
    userId: string;
    plaidItemId: string;
    accountId: string;
    aprs: {
        balanceSubjectToApr?: number | undefined;
        interestChargeAmount?: number | undefined;
        aprPercentage: number;
        aprType: string;
    }[];
    isOverdue: boolean;
    lastPaymentAmount: number | undefined;
    lastPaymentDate: string | undefined;
    lastStatementBalance: number | undefined;
    lastStatementIssueDate: string | undefined;
    minimumPaymentAmount: number | undefined;
    nextPaymentDueDate: string | undefined;
    createdAt: number;
    updatedAt: number;
}[]>>;
/**
 * Get all mortgage liabilities for a user.
 *
 * @security Components cannot access ctx.auth. Host apps must validate userId
 * before calling this query.
 */
export declare const getMortgageLiabilitiesByUser: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: string;
    userId: string;
    plaidItemId: string;
    accountId: string;
    accountNumber: string | undefined;
    loanTerm: string | undefined;
    loanTypeDescription: string | undefined;
    originationDate: string | undefined;
    maturityDate: string | undefined;
    interestRatePercentage: number;
    interestRateType: string | undefined;
    lastPaymentAmount: number | undefined;
    lastPaymentDate: string | undefined;
    nextMonthlyPayment: number | undefined;
    nextPaymentDueDate: string | undefined;
    originationPrincipalAmount: number | undefined;
    currentLateFee: number | undefined;
    escrowBalance: number | undefined;
    pastDueAmount: number | undefined;
    ytdInterestPaid: number | undefined;
    ytdPrincipalPaid: number | undefined;
    hasPmi: boolean | undefined;
    hasPrepaymentPenalty: boolean | undefined;
    propertyAddress: {
        street?: string | undefined;
        city?: string | undefined;
        region?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    createdAt: number;
    updatedAt: number;
}[]>>;
/**
 * Get mortgage liability for a specific account.
 *
 * @security Components cannot access ctx.auth. Host apps must verify ownership
 * of the account before calling this query.
 */
export declare const getMortgageLiabilityByAccount: import("convex/server").RegisteredQuery<"public", {
    accountId: string;
}, Promise<{
    _id: string;
    userId: string;
    plaidItemId: string;
    accountId: string;
    accountNumber: string | undefined;
    loanTerm: string | undefined;
    loanTypeDescription: string | undefined;
    originationDate: string | undefined;
    maturityDate: string | undefined;
    interestRatePercentage: number;
    interestRateType: string | undefined;
    lastPaymentAmount: number | undefined;
    lastPaymentDate: string | undefined;
    nextMonthlyPayment: number | undefined;
    nextPaymentDueDate: string | undefined;
    originationPrincipalAmount: number | undefined;
    currentLateFee: number | undefined;
    escrowBalance: number | undefined;
    pastDueAmount: number | undefined;
    ytdInterestPaid: number | undefined;
    ytdPrincipalPaid: number | undefined;
    hasPmi: boolean | undefined;
    hasPrepaymentPenalty: boolean | undefined;
    propertyAddress: {
        street?: string | undefined;
        city?: string | undefined;
        region?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    createdAt: number;
    updatedAt: number;
} | null>>;
/**
 * Get all student loan liabilities for a user.
 *
 * @security Components cannot access ctx.auth. Host apps must validate userId
 * before calling this query.
 */
export declare const getStudentLoanLiabilitiesByUser: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: string;
    userId: string;
    plaidItemId: string;
    accountId: string;
    accountNumber: string | undefined;
    loanName: string | undefined;
    guarantor: string | undefined;
    sequenceNumber: string | undefined;
    disbursementDates: string[] | undefined;
    originationDate: string | undefined;
    expectedPayoffDate: string | undefined;
    lastStatementIssueDate: string | undefined;
    interestRatePercentage: number;
    lastPaymentAmount: number | undefined;
    lastPaymentDate: string | undefined;
    minimumPaymentAmount: number | undefined;
    nextPaymentDueDate: string | undefined;
    paymentReferenceNumber: string | undefined;
    originationPrincipalAmount: number | undefined;
    outstandingInterestAmount: number | undefined;
    lastStatementBalance: number | undefined;
    ytdInterestPaid: number | undefined;
    ytdPrincipalPaid: number | undefined;
    isOverdue: boolean | undefined;
    loanStatus: {
        endDate?: string | undefined;
        type?: string | undefined;
    } | undefined;
    repaymentPlan: {
        type?: string | undefined;
        description?: string | undefined;
    } | undefined;
    servicerAddress: {
        street?: string | undefined;
        city?: string | undefined;
        region?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    createdAt: number;
    updatedAt: number;
}[]>>;
/**
 * Get student loan liability for a specific account.
 *
 * @security Components cannot access ctx.auth. Host apps must verify ownership
 * of the account before calling this query.
 */
export declare const getStudentLoanLiabilityByAccount: import("convex/server").RegisteredQuery<"public", {
    accountId: string;
}, Promise<{
    _id: string;
    userId: string;
    plaidItemId: string;
    accountId: string;
    accountNumber: string | undefined;
    loanName: string | undefined;
    guarantor: string | undefined;
    sequenceNumber: string | undefined;
    disbursementDates: string[] | undefined;
    originationDate: string | undefined;
    expectedPayoffDate: string | undefined;
    lastStatementIssueDate: string | undefined;
    interestRatePercentage: number;
    lastPaymentAmount: number | undefined;
    lastPaymentDate: string | undefined;
    minimumPaymentAmount: number | undefined;
    nextPaymentDueDate: string | undefined;
    paymentReferenceNumber: string | undefined;
    originationPrincipalAmount: number | undefined;
    outstandingInterestAmount: number | undefined;
    lastStatementBalance: number | undefined;
    ytdInterestPaid: number | undefined;
    ytdPrincipalPaid: number | undefined;
    isOverdue: boolean | undefined;
    loanStatus: {
        endDate?: string | undefined;
        type?: string | undefined;
    } | undefined;
    repaymentPlan: {
        type?: string | undefined;
        description?: string | undefined;
    } | undefined;
    servicerAddress: {
        street?: string | undefined;
        city?: string | undefined;
        region?: string | undefined;
        postalCode?: string | undefined;
        country?: string | undefined;
    } | undefined;
    createdAt: number;
    updatedAt: number;
} | null>>;
/**
 * Get merchant enrichment data by merchant ID.
 */
export declare const getMerchantEnrichment: import("convex/server").RegisteredQuery<"public", {
    merchantId: string;
}, Promise<{
    _id: string;
    merchantId: string;
    merchantName: string;
    logoUrl: string | undefined;
    categoryPrimary: string | undefined;
    categoryDetailed: string | undefined;
    categoryIconUrl: string | undefined;
    website: string | undefined;
    phoneNumber: string | undefined;
    confidenceLevel: "UNKNOWN" | "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";
    lastEnriched: number;
} | null>>;
/**
 * Delete a Plaid item and all associated data.
 *
 * Uses recursive batched deletion to handle large datasets without timeout.
 * The item is immediately marked as "deleting" (fast response to caller),
 * then background workers delete associated data in batches.
 *
 * @param plaidItemId - The ID of the plaidItem to delete
 * @returns Status of deletion (scheduled or not found)
 *
 * @security Components cannot access ctx.auth. Host apps must verify ownership
 * before allowing this mutation.
 */
export declare const deletePlaidItem: import("convex/server").RegisteredMutation<"public", {
    plaidItemId: string;
}, Promise<{
    status: "not_found";
    message: string;
} | {
    status: "scheduled";
    message: string;
}>>;
/**
 * Toggle the isActive state of a plaidItem.
 * Used to pause/resume syncing for a bank connection.
 *
 * @security Components cannot access ctx.auth. Host apps must verify ownership
 * before allowing this mutation.
 */
export declare const togglePlaidItemActive: import("convex/server").RegisteredMutation<"public", {
    itemId: string;
}, Promise<{
    isActive: boolean;
}>>;
/**
 * Explicitly set the isActive state of a plaidItem.
 * Used when you need to set a specific state rather than toggle.
 *
 * @security Components cannot access ctx.auth. Host apps must verify ownership
 * before allowing this mutation.
 */
export declare const setPlaidItemActive: import("convex/server").RegisteredMutation<"public", {
    isActive: boolean;
    itemId: string;
}, Promise<null>>;
/**
 * Get all recurring streams for a user.
 *
 * @security Components cannot access ctx.auth. Host apps must validate userId
 * before calling this query.
 */
export declare const getRecurringStreamsByUser: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: string;
    userId: string;
    plaidItemId: string;
    streamId: string;
    accountId: string;
    description: string;
    merchantName: string | undefined;
    averageAmount: number;
    lastAmount: number;
    isoCurrencyCode: string;
    frequency: string;
    status: "MATURE" | "EARLY_DETECTION" | "TOMBSTONED";
    isActive: boolean;
    type: "inflow" | "outflow";
    category: string | undefined;
    firstDate: string | undefined;
    lastDate: string | undefined;
    predictedNextDate: string | undefined;
    createdAt: number;
    updatedAt: number;
}[]>>;
/**
 * Get recurring streams for a specific plaidItem.
 *
 * @security Components cannot access ctx.auth. Host apps must verify ownership
 * of the plaidItem before calling this query.
 */
export declare const getRecurringStreamsByItem: import("convex/server").RegisteredQuery<"public", {
    plaidItemId: string;
}, Promise<{
    _id: string;
    userId: string;
    plaidItemId: string;
    streamId: string;
    accountId: string;
    description: string;
    merchantName: string | undefined;
    averageAmount: number;
    lastAmount: number;
    isoCurrencyCode: string;
    frequency: string;
    status: "MATURE" | "EARLY_DETECTION" | "TOMBSTONED";
    isActive: boolean;
    type: "inflow" | "outflow";
    category: string | undefined;
    firstDate: string | undefined;
    lastDate: string | undefined;
    predictedNextDate: string | undefined;
    createdAt: number;
    updatedAt: number;
}[]>>;
/**
 * Get active subscriptions (MATURE + outflow + isActive).
 * These are established recurring expenses like Netflix, Spotify, etc.
 *
 * @security Components cannot access ctx.auth. Host apps must validate userId
 * before calling this query.
 */
export declare const getActiveSubscriptions: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: string;
    userId: string;
    plaidItemId: string;
    streamId: string;
    accountId: string;
    description: string;
    merchantName: string | undefined;
    averageAmount: number;
    lastAmount: number;
    isoCurrencyCode: string;
    frequency: string;
    status: "MATURE" | "EARLY_DETECTION" | "TOMBSTONED";
    isActive: boolean;
    type: "inflow" | "outflow";
    category: string | undefined;
    firstDate: string | undefined;
    lastDate: string | undefined;
    predictedNextDate: string | undefined;
    createdAt: number;
    updatedAt: number;
}[]>>;
/**
 * Get recurring income streams (MATURE + inflow + isActive).
 * These are established recurring income like paychecks, deposits, etc.
 *
 * @security Components cannot access ctx.auth. Host apps must validate userId
 * before calling this query.
 */
export declare const getRecurringIncome: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: string;
    userId: string;
    plaidItemId: string;
    streamId: string;
    accountId: string;
    description: string;
    merchantName: string | undefined;
    averageAmount: number;
    lastAmount: number;
    isoCurrencyCode: string;
    frequency: string;
    status: "MATURE" | "EARLY_DETECTION" | "TOMBSTONED";
    isActive: boolean;
    type: "inflow" | "outflow";
    category: string | undefined;
    firstDate: string | undefined;
    lastDate: string | undefined;
    predictedNextDate: string | undefined;
    createdAt: number;
    updatedAt: number;
}[]>>;
/**
 * Get subscriptions summary for a user.
 * Returns count and estimated monthly total.
 *
 * @security Components cannot access ctx.auth. Host apps must validate userId
 * before calling this query.
 */
export declare const getSubscriptionsSummary: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    count: number;
    monthlyTotal: number;
    weeklyCount: number;
    biweeklyCount: number;
    monthlyCount: number;
    annualCount: number;
}>>;
/**
 * Get sync logs for a specific plaidItem.
 * Returns most recent first.
 *
 * @security Components cannot access ctx.auth. Host apps must verify ownership
 * of the plaidItem before calling this query.
 */
export declare const getSyncLogsByItem: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    plaidItemId: string;
}, Promise<{
    _id: string;
    plaidItemId: string;
    userId: string;
    syncType: "transactions" | "liabilities" | "recurring" | "accounts" | "onboard";
    trigger: "onboard" | "webhook" | "scheduled" | "manual";
    startedAt: number;
    completedAt: number | undefined;
    durationMs: number | undefined;
    status: "started" | "success" | "error" | "rate_limited" | "circuit_open";
    result: {
        transactionsAdded?: number | undefined;
        transactionsModified?: number | undefined;
        transactionsRemoved?: number | undefined;
        accountsUpdated?: number | undefined;
        streamsUpdated?: number | undefined;
        creditCardsUpdated?: number | undefined;
        mortgagesUpdated?: number | undefined;
        studentLoansUpdated?: number | undefined;
    } | undefined;
    errorCode: string | undefined;
    errorMessage: string | undefined;
    retryCount: number | undefined;
}[]>>;
/**
 * Get sync logs for a user.
 * Returns most recent first.
 *
 * @security Components cannot access ctx.auth. Host apps must validate userId
 * before calling this query.
 */
export declare const getSyncLogsByUser: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    userId: string;
}, Promise<{
    _id: string;
    plaidItemId: string;
    userId: string;
    syncType: "transactions" | "liabilities" | "recurring" | "accounts" | "onboard";
    trigger: "onboard" | "webhook" | "scheduled" | "manual";
    startedAt: number;
    completedAt: number | undefined;
    durationMs: number | undefined;
    status: "started" | "success" | "error" | "rate_limited" | "circuit_open";
    result: {
        transactionsAdded?: number | undefined;
        transactionsModified?: number | undefined;
        transactionsRemoved?: number | undefined;
        accountsUpdated?: number | undefined;
        streamsUpdated?: number | undefined;
        creditCardsUpdated?: number | undefined;
        mortgagesUpdated?: number | undefined;
        studentLoansUpdated?: number | undefined;
    } | undefined;
    errorCode: string | undefined;
    errorMessage: string | undefined;
    retryCount: number | undefined;
}[]>>;
/**
 * Get sync statistics for a plaidItem.
 * Useful for monitoring sync health.
 *
 * @security Components cannot access ctx.auth. Host apps must verify ownership
 * of the plaidItem before calling this query.
 */
export declare const getSyncStats: import("convex/server").RegisteredQuery<"public", {
    daysBack?: number | undefined;
    plaidItemId: string;
}, Promise<{
    totalSyncs: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    averageDurationMs: number | undefined;
    lastSyncAt: number;
    lastSuccessAt: number;
    lastErrorAt: number;
    lastErrorMessage: string | undefined;
}>>;
/**
 * Get institution metadata by institutionId.
 * Returns cached institution data including logo and branding.
 */
export declare const getInstitution: import("convex/server").RegisteredQuery<"public", {
    institutionId: string;
}, Promise<{
    _id: string;
    institutionId: string;
    name: string;
    logo: string | undefined;
    primaryColor: string | undefined;
    url: string | undefined;
    products: string[] | undefined;
    lastFetched: number;
} | null>>;
/**
 * Get all cached institutions.
 * Useful for displaying a list of known institutions.
 */
export declare const getAllInstitutions: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: string;
    institutionId: string;
    name: string;
    logo: string | undefined;
    primaryColor: string | undefined;
    url: string | undefined;
    products: string[] | undefined;
    lastFetched: number;
}[]>>;
/**
 * Host-exposed internal entry points for webhook and cron state maintained by
 * the component. These live in the public module because Convex components do
 * not expose the private module across the host/component boundary.
 */
export declare const setNewAccountsAvailableInternal: import("convex/server").RegisteredMutation<"public", {
    plaidItemId: string;
}, Promise<null>>;
export declare const clearNewAccountsAvailableInternal: import("convex/server").RegisteredMutation<"public", {
    plaidItemId: string;
}, Promise<null>>;
export declare const markFirstErrorAtInternal: import("convex/server").RegisteredMutation<"public", {
    plaidItemId: string;
}, Promise<null>>;
export declare const clearErrorTrackingInternal: import("convex/server").RegisteredMutation<"public", {
    plaidItemId: string;
}, Promise<null>>;
export declare const markItemErrorDispatchedInternal: import("convex/server").RegisteredMutation<"public", {
    plaidItemId: string;
}, Promise<null>>;
export declare const listErrorItemsInternal: import("convex/server").RegisteredQuery<"public", {
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
/**
 * Record a Plaid webhook receipt and detect in-flight duplicate deliveries.
 *
 * @security Components cannot verify webhook signatures. The host app must
 * call this only after signature verification or in an approved sandbox mode.
 */
export declare const recordWebhookReceived: import("convex/server").RegisteredMutation<"public", {
    dedupeWindowMs?: number | undefined;
    itemId: string;
    webhookType: string;
    webhookCode: string;
    bodyHash: string;
    receivedAt: number;
}, Promise<{
    webhookLogId: string;
    duplicate: boolean;
    duplicateOf: string | undefined;
}>>;
/**
 * Update a Plaid webhook processing log.
 */
export declare const updateWebhookProcessingStatus: import("convex/server").RegisteredMutation<"public", {
    errorMessage?: string | undefined;
    processedAt?: number | undefined;
    scheduledFunctionId?: string | undefined;
    status: "received" | "processing" | "processed" | "duplicate" | "failed";
    webhookLogId: string;
}, Promise<null>>;
/**
 * Get health for a single plaidItem.
 *
 * @security Components cannot access ctx.auth. Host apps must verify the caller
 * owns this item before returning data.
 */
export declare const getItemHealth: import("convex/server").RegisteredQuery<"public", {
    plaidItemId: string;
}, Promise<import("./health.js").ItemHealth>>;
/**
 * Get health for every non-deleting plaidItem owned by userId.
 *
 * Filters `status === "deleting"` rows out of the list so the UI does not
 * render mid-cascade-delete items.
 *
 * @security Components cannot access ctx.auth. Host apps must validate userId
 * before calling this query.
 */
export declare const getItemHealthByUser: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<import("./health.js").ItemHealth[]>>;
//# sourceMappingURL=public.d.ts.map