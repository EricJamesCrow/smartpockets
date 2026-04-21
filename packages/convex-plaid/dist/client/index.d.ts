/**
 * Plaid Component Client
 *
 * Main client class for the Plaid component.
 * Provides methods for Plaid Link, account syncing, transactions, and liabilities.
 *
 * IMPORTANT: Components cannot access process.env.
 * All configuration must be provided via PlaidConfig.
 */
import type { ActionCtx, PlaidConfig, HttpRouter, RegisterRoutesConfig, CreateLinkTokenResult, ExchangePublicTokenResult, FetchAccountsResult, SyncTransactionsResult, SyncTransactionsOptions, FetchLiabilitiesResult, OnboardItemResult, FetchRecurringStreamsResult, CreateUpdateLinkTokenResult, CompleteReauthResult, TriggerTransactionsRefreshResult, EnrichTransactionsResult, SyncType, SyncTrigger, SyncStatus, SyncResult, SyncStats, InstitutionMetadata, PlaidAccount, PlaidAccountFilters, PlaidItem, PlaidItemStatus, CircuitState, UserIdentity, AuthenticatedContext, SecureWrapper } from "./types.js";
import type { ComponentApi } from "../component/_generated/component.js";
/**
 * Error thrown when Plaid configuration is invalid.
 */
export declare class PlaidConfigError extends Error {
    constructor(message: string);
}
/**
 * Type for the Plaid component API used by the Plaid client class.
 * Uses Pick to only require the parts actually used by the Plaid client.
 * This allows host apps to use the component without needing access to private internals.
 *
 * NOTE: registerRoutes() needs the full ComponentApi including private functions
 * for webhook handling.
 */
export type PlaidComponent = Pick<ComponentApi, "actions" | "public">;
/**
 * Full component API type for use with registerRoutes().
 * Re-exported for convenience.
 */
export type { ComponentApi };
export type { ReasonCode } from "../component/reasonCode.js";
export { mapErrorCodeToReason } from "../component/reasonCode.js";
export type { ItemHealth } from "../component/health.js";
export type { PlaidConfig, RegisterRoutesConfig, CreateLinkTokenResult, ExchangePublicTokenResult, FetchAccountsResult, SyncTransactionsResult, SyncTransactionsOptions, FetchLiabilitiesResult, OnboardItemResult, FetchRecurringStreamsResult, CreateUpdateLinkTokenResult, CompleteReauthResult, TriggerTransactionsRefreshResult, EnrichTransactionsResult, ActionCtx, SyncType, SyncTrigger, SyncStatus, SyncResult, SyncStats, InstitutionMetadata, PlaidAccount, PlaidAccountFilters, PlaidItem, PlaidItemStatus, CircuitState, UserIdentity, AuthenticatedContext, SecureWrapper, };
/**
 * Plaid Component Client
 *
 * Provides methods for managing Plaid Link, accounts, transactions,
 * and liabilities through Convex.
 *
 * @example
 * ```typescript
 * // In your convex/plaid.ts
 * import { Plaid } from "@crowdevelopment/convex-plaid";
 * import { components } from "./_generated/api";
 *
 * const plaid = new Plaid(components.plaid, {
 *   PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID!,
 *   PLAID_SECRET: process.env.PLAID_SECRET!,
 *   PLAID_ENV: process.env.PLAID_ENV!,
 *   ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
 * });
 *
 * export const createLinkToken = action({
 *   args: { userId: v.string() },
 *   handler: async (ctx, args) => {
 *     return await plaid.createLinkToken(ctx, args);
 *   },
 * });
 * ```
 */
export declare class Plaid {
    component: PlaidComponent;
    private config;
    constructor(component: PlaidComponent, config: PlaidConfig);
    /**
     * Create a link token for Plaid Link UI initialization.
     *
     * Link tokens are short-lived (30 minutes) and frontend-only.
     * Call this before opening the Plaid Link modal.
     */
    createLinkToken(ctx: ActionCtx, args: {
        userId: string;
        products?: string[];
        accountFilters?: PlaidAccountFilters;
        countryCodes?: string[];
        language?: string;
        clientName?: string;
        webhookUrl?: string;
    }): Promise<CreateLinkTokenResult>;
    /**
     * Exchange Plaid public token for access token and create plaidItem.
     *
     * Flow:
     * 1. Exchange public token with Plaid
     * 2. Encrypt access token
     * 3. Create plaidItem in component database
     *
     * NOTE: Access token is NOT returned for security.
     */
    exchangePublicToken(ctx: ActionCtx, args: {
        publicToken: string;
        userId: string;
    }): Promise<ExchangePublicTokenResult>;
    /**
     * Fetch and store account data from Plaid.
     *
     * @param plaidItemId - Convex document ID of the plaidItem (as string)
     */
    fetchAccounts(ctx: ActionCtx, args: {
        plaidItemId: string;
    }): Promise<FetchAccountsResult>;
    /**
     * Sync transactions using cursor-based pagination with race condition protection.
     *
     * Features:
     * - Optimistic locking prevents concurrent syncs from causing duplicates
     * - Pagination limits prevent memory explosion on large syncs
     * - If hasMore=true, caller should schedule another sync
     *
     * @param plaidItemId - Convex document ID of the plaidItem (as string)
     * @param options - Optional pagination limits (maxPages, maxTransactions)
     */
    syncTransactions(ctx: ActionCtx, args: {
        plaidItemId: string;
    } & SyncTransactionsOptions): Promise<SyncTransactionsResult>;
    /**
     * Fetch and store liability data (credit cards, mortgages, student loans).
     *
     * @param plaidItemId - Convex document ID of the plaidItem (as string)
     */
    fetchLiabilities(ctx: ActionCtx, args: {
        plaidItemId: string;
    }): Promise<FetchLiabilitiesResult>;
    /**
     * Trigger a transactions refresh for a Plaid item.
     *
     * Forces Plaid to fetch the latest transactions from the financial institution.
     * This is useful when you need up-to-date data without waiting for webhooks.
     *
     * Note: Some institutions (e.g., Capital One) don't support this endpoint
     * and will return PRODUCTS_NOT_SUPPORTED.
     *
     * @param plaidItemId - Convex document ID of the plaidItem (as string)
     */
    triggerTransactionsRefresh(ctx: ActionCtx, args: {
        plaidItemId: string;
    }): Promise<TriggerTransactionsRefreshResult>;
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
    enrichTransactions(ctx: ActionCtx, args: {
        transactions: Array<{
            id: string;
            description: string;
            amount: number;
            direction: "INFLOW" | "OUTFLOW";
            iso_currency_code?: string;
            mcc?: string;
            location?: {
                city?: string;
                region?: string;
                postal_code?: string;
                country?: string;
            };
        }>;
    }): Promise<EnrichTransactionsResult>;
    /**
     * Fetch and store recurring transaction streams.
     *
     * Identifies subscriptions, regular bills, and recurring income.
     *
     * @param plaidItemId - Convex document ID of the plaidItem (as string)
     */
    fetchRecurringStreams(ctx: ActionCtx, args: {
        plaidItemId: string;
    }): Promise<FetchRecurringStreamsResult>;
    /**
     * Create an update link token for re-authentication.
     *
     * Use this when a plaidItem is in 'needs_reauth' status.
     * Opens Plaid Link in update mode instead of creating a new connection.
     *
     * @param plaidItemId - Convex document ID of the plaidItem (as string)
     */
    createUpdateLinkToken(ctx: ActionCtx, args: {
        plaidItemId: string;
        mode?: "reauth" | "account_select";
    }): Promise<CreateUpdateLinkTokenResult>;
    /**
     * Complete re-authentication after user has gone through update Link flow.
     *
     * Unlike initial connection, update flow doesn't return a new public token.
     * This marks the item as active again.
     *
     * @param plaidItemId - Convex document ID of the plaidItem (as string)
     */
    completeReauth(ctx: ActionCtx, args: {
        plaidItemId: string;
    }): Promise<CompleteReauthResult>;
    /**
     * Onboard a new Plaid item by fetching all data.
     *
     * Convenience method that runs all sync operations:
     * 1. Fetch accounts
     * 2. Sync transactions
     * 3. Fetch liabilities
     * 4. Fetch recurring streams
     *
     * Call this after exchangePublicToken completes.
     *
     * @param plaidItemId - Convex document ID from exchangePublicToken
     */
    onboardItem(ctx: ActionCtx, args: {
        plaidItemId: string;
    }): Promise<OnboardItemResult>;
    /**
     * Get the public queries/mutations API for use in query/mutation handlers.
     *
     * @example
     * ```typescript
     * // In a query handler
     * const items = await ctx.runQuery(plaid.api.getItemsByUser, { userId });
     * ```
     */
    get api(): {
        deletePlaidItem: import("convex/server").FunctionReference<"mutation", "internal", {
            plaidItemId: string;
        }, {
            deleted: {
                accounts: number;
                creditCardLiabilities: number;
                items: number;
                mortgageLiabilities: number;
                recurringStreams: number;
                studentLoanLiabilities: number;
                transactions: number;
            };
        }, string | undefined>;
        getAccountsByItem: import("convex/server").FunctionReference<"query", "internal", {
            plaidItemId: string;
        }, {
            _id: string;
            accountId: string;
            balances: {
                available?: number;
                current?: number;
                isoCurrencyCode: string;
                limit?: number;
            };
            createdAt: number;
            mask?: string;
            name: string;
            officialName?: string;
            plaidItemId: string;
            subtype?: string;
            type: string;
            userId: string;
        }[], string | undefined>;
        getAccountsByUser: import("convex/server").FunctionReference<"query", "internal", {
            userId: string;
        }, {
            _id: string;
            accountId: string;
            balances: {
                available?: number;
                current?: number;
                isoCurrencyCode: string;
                limit?: number;
            };
            createdAt: number;
            mask?: string;
            name: string;
            officialName?: string;
            plaidItemId: string;
            subtype?: string;
            type: string;
            userId: string;
        }[], string | undefined>;
        getActiveSubscriptions: import("convex/server").FunctionReference<"query", "internal", {
            userId: string;
        }, {
            _id: string;
            accountId: string;
            averageAmount: number;
            category?: string;
            createdAt: number;
            description: string;
            firstDate?: string;
            frequency: string;
            isActive: boolean;
            isoCurrencyCode: string;
            lastAmount: number;
            lastDate?: string;
            merchantName?: string;
            plaidItemId: string;
            predictedNextDate?: string;
            status: string;
            streamId: string;
            type: string;
            updatedAt: number;
            userId: string;
        }[], string | undefined>;
        getAllInstitutions: import("convex/server").FunctionReference<"query", "internal", {}, {
            _id: string;
            institutionId: string;
            lastFetched: number;
            logo?: string;
            name: string;
            primaryColor?: string;
            products?: Array<string>;
            url?: string;
        }[], string | undefined>;
        getInstitution: import("convex/server").FunctionReference<"query", "internal", {
            institutionId: string;
        }, {
            _id: string;
            institutionId: string;
            lastFetched: number;
            logo?: string;
            name: string;
            primaryColor?: string;
            products?: Array<string>;
            url?: string;
        } | null, string | undefined>;
        getItem: import("convex/server").FunctionReference<"query", "internal", {
            plaidItemId: string;
        }, {
            _id: string;
            activatedAt?: number;
            circuitState?: string;
            consecutiveFailures?: number;
            createdAt: number;
            disconnectedAt?: number;
            disconnectedReason?: string;
            errorAt?: number;
            errorCode?: string;
            errorMessage?: string;
            institutionId?: string;
            institutionName?: string;
            isActive?: boolean;
            itemId: string;
            lastFailureAt?: number;
            lastSyncedAt?: number;
            nextRetryAt?: number;
            products: Array<string>;
            reauthAt?: number;
            reauthReason?: string;
            status: string;
            syncError?: string;
            userId: string;
        } | null, string | undefined>;
        getItemsByUser: import("convex/server").FunctionReference<"query", "internal", {
            userId: string;
        }, {
            _id: string;
            activatedAt?: number;
            circuitState?: string;
            consecutiveFailures?: number;
            createdAt: number;
            disconnectedAt?: number;
            disconnectedReason?: string;
            errorAt?: number;
            errorCode?: string;
            errorMessage?: string;
            institutionId?: string;
            institutionName?: string;
            isActive?: boolean;
            itemId: string;
            lastFailureAt?: number;
            lastSyncedAt?: number;
            nextRetryAt?: number;
            products: Array<string>;
            reauthAt?: number;
            reauthReason?: string;
            status: string;
            syncError?: string;
            userId: string;
        }[], string | undefined>;
        getItemHealth: import("convex/server").FunctionReference<"query", "internal", {
            plaidItemId: string;
        }, {
            plaidItemId: string;
            itemId: string;
            state: "syncing" | "ready" | "error" | "re-consent-required";
            recommendedAction: "reconnect" | "reconnect_for_new_accounts" | "wait" | "contact_support" | null;
            reasonCode: "healthy" | "syncing_initial" | "syncing_incremental" | "auth_required_login" | "auth_required_expiration" | "transient_circuit_open" | "transient_institution_down" | "transient_rate_limited" | "permanent_invalid_token" | "permanent_item_not_found" | "permanent_no_accounts" | "permanent_access_not_granted" | "permanent_products_not_supported" | "permanent_institution_unsupported" | "permanent_revoked" | "permanent_unknown" | "new_accounts_available";
            isActive: boolean;
            institutionId: string | null;
            institutionName: string | null;
            institutionLogoBase64: string | null;
            institutionPrimaryColor: string | null;
            lastSyncedAt: number | null;
            lastWebhookAt: number | null;
            errorCode: string | null;
            errorMessage: string | null;
            circuitState: "closed" | "open" | "half_open";
            consecutiveFailures: number;
            nextRetryAt: number | null;
            newAccountsAvailableAt: number | null;
        }, string | undefined>;
        getItemHealthByUser: import("convex/server").FunctionReference<"query", "internal", {
            userId: string;
        }, {
            plaidItemId: string;
            itemId: string;
            state: "syncing" | "ready" | "error" | "re-consent-required";
            recommendedAction: "reconnect" | "reconnect_for_new_accounts" | "wait" | "contact_support" | null;
            reasonCode: "healthy" | "syncing_initial" | "syncing_incremental" | "auth_required_login" | "auth_required_expiration" | "transient_circuit_open" | "transient_institution_down" | "transient_rate_limited" | "permanent_invalid_token" | "permanent_item_not_found" | "permanent_no_accounts" | "permanent_access_not_granted" | "permanent_products_not_supported" | "permanent_institution_unsupported" | "permanent_revoked" | "permanent_unknown" | "new_accounts_available";
            isActive: boolean;
            institutionId: string | null;
            institutionName: string | null;
            institutionLogoBase64: string | null;
            institutionPrimaryColor: string | null;
            lastSyncedAt: number | null;
            lastWebhookAt: number | null;
            errorCode: string | null;
            errorMessage: string | null;
            circuitState: "closed" | "open" | "half_open";
            consecutiveFailures: number;
            nextRetryAt: number | null;
            newAccountsAvailableAt: number | null;
        }[], string | undefined>;
        getLiabilitiesByItem: import("convex/server").FunctionReference<"query", "internal", {
            plaidItemId: string;
        }, {
            _id: string;
            accountId: string;
            aprs: Array<{
                aprPercentage: number;
                aprType: string;
                balanceSubjectToApr?: number;
                interestChargeAmount?: number;
            }>;
            createdAt: number;
            isOverdue: boolean;
            lastPaymentAmount?: number;
            lastPaymentDate?: string;
            lastStatementBalance?: number;
            lastStatementIssueDate?: string;
            minimumPaymentAmount?: number;
            nextPaymentDueDate?: string;
            plaidItemId: string;
            updatedAt: number;
            userId: string;
        }[], string | undefined>;
        getLiabilitiesByUser: import("convex/server").FunctionReference<"query", "internal", {
            userId: string;
        }, {
            _id: string;
            accountId: string;
            aprs: Array<{
                aprPercentage: number;
                aprType: string;
                balanceSubjectToApr?: number;
                interestChargeAmount?: number;
            }>;
            createdAt: number;
            isOverdue: boolean;
            lastPaymentAmount?: number;
            lastPaymentDate?: string;
            lastStatementBalance?: number;
            lastStatementIssueDate?: string;
            minimumPaymentAmount?: number;
            nextPaymentDueDate?: string;
            plaidItemId: string;
            updatedAt: number;
            userId: string;
        }[], string | undefined>;
        getMerchantEnrichment: import("convex/server").FunctionReference<"query", "internal", {
            merchantId: string;
        }, {
            _id: string;
            categoryDetailed?: string;
            categoryIconUrl?: string;
            categoryPrimary?: string;
            confidenceLevel: string;
            lastEnriched: number;
            logoUrl?: string;
            merchantId: string;
            merchantName: string;
            phoneNumber?: string;
            website?: string;
        } | null, string | undefined>;
        getMortgageLiabilitiesByUser: import("convex/server").FunctionReference<"query", "internal", {
            userId: string;
        }, {
            _id: string;
            accountId: string;
            accountNumber?: string;
            createdAt: number;
            currentLateFee?: number;
            escrowBalance?: number;
            hasPmi?: boolean;
            hasPrepaymentPenalty?: boolean;
            interestRatePercentage: number;
            interestRateType?: string;
            lastPaymentAmount?: number;
            lastPaymentDate?: string;
            loanTerm?: string;
            loanTypeDescription?: string;
            maturityDate?: string;
            nextMonthlyPayment?: number;
            nextPaymentDueDate?: string;
            originationDate?: string;
            originationPrincipalAmount?: number;
            pastDueAmount?: number;
            plaidItemId: string;
            propertyAddress?: {
                city?: string;
                country?: string;
                postalCode?: string;
                region?: string;
                street?: string;
            };
            updatedAt: number;
            userId: string;
            ytdInterestPaid?: number;
            ytdPrincipalPaid?: number;
        }[], string | undefined>;
        getMortgageLiabilityByAccount: import("convex/server").FunctionReference<"query", "internal", {
            accountId: string;
        }, {
            _id: string;
            accountId: string;
            accountNumber?: string;
            createdAt: number;
            currentLateFee?: number;
            escrowBalance?: number;
            hasPmi?: boolean;
            hasPrepaymentPenalty?: boolean;
            interestRatePercentage: number;
            interestRateType?: string;
            lastPaymentAmount?: number;
            lastPaymentDate?: string;
            loanTerm?: string;
            loanTypeDescription?: string;
            maturityDate?: string;
            nextMonthlyPayment?: number;
            nextPaymentDueDate?: string;
            originationDate?: string;
            originationPrincipalAmount?: number;
            pastDueAmount?: number;
            plaidItemId: string;
            propertyAddress?: {
                city?: string;
                country?: string;
                postalCode?: string;
                region?: string;
                street?: string;
            };
            updatedAt: number;
            userId: string;
            ytdInterestPaid?: number;
            ytdPrincipalPaid?: number;
        } | null, string | undefined>;
        getRecurringIncome: import("convex/server").FunctionReference<"query", "internal", {
            userId: string;
        }, {
            _id: string;
            accountId: string;
            averageAmount: number;
            category?: string;
            createdAt: number;
            description: string;
            firstDate?: string;
            frequency: string;
            isActive: boolean;
            isoCurrencyCode: string;
            lastAmount: number;
            lastDate?: string;
            merchantName?: string;
            plaidItemId: string;
            predictedNextDate?: string;
            status: string;
            streamId: string;
            type: string;
            updatedAt: number;
            userId: string;
        }[], string | undefined>;
        getRecurringStreamsByItem: import("convex/server").FunctionReference<"query", "internal", {
            plaidItemId: string;
        }, {
            _id: string;
            accountId: string;
            averageAmount: number;
            category?: string;
            createdAt: number;
            description: string;
            firstDate?: string;
            frequency: string;
            isActive: boolean;
            isoCurrencyCode: string;
            lastAmount: number;
            lastDate?: string;
            merchantName?: string;
            plaidItemId: string;
            predictedNextDate?: string;
            status: string;
            streamId: string;
            type: string;
            updatedAt: number;
            userId: string;
        }[], string | undefined>;
        getRecurringStreamsByUser: import("convex/server").FunctionReference<"query", "internal", {
            userId: string;
        }, {
            _id: string;
            accountId: string;
            averageAmount: number;
            category?: string;
            createdAt: number;
            description: string;
            firstDate?: string;
            frequency: string;
            isActive: boolean;
            isoCurrencyCode: string;
            lastAmount: number;
            lastDate?: string;
            merchantName?: string;
            plaidItemId: string;
            predictedNextDate?: string;
            status: string;
            streamId: string;
            type: string;
            updatedAt: number;
            userId: string;
        }[], string | undefined>;
        getStudentLoanLiabilitiesByUser: import("convex/server").FunctionReference<"query", "internal", {
            userId: string;
        }, {
            _id: string;
            accountId: string;
            accountNumber?: string;
            createdAt: number;
            disbursementDates?: Array<string>;
            expectedPayoffDate?: string;
            guarantor?: string;
            interestRatePercentage: number;
            isOverdue?: boolean;
            lastPaymentAmount?: number;
            lastPaymentDate?: string;
            lastStatementBalance?: number;
            lastStatementIssueDate?: string;
            loanName?: string;
            loanStatus?: {
                endDate?: string;
                type?: string;
            };
            minimumPaymentAmount?: number;
            nextPaymentDueDate?: string;
            originationDate?: string;
            originationPrincipalAmount?: number;
            outstandingInterestAmount?: number;
            paymentReferenceNumber?: string;
            plaidItemId: string;
            repaymentPlan?: {
                description?: string;
                type?: string;
            };
            sequenceNumber?: string;
            servicerAddress?: {
                city?: string;
                country?: string;
                postalCode?: string;
                region?: string;
                street?: string;
            };
            updatedAt: number;
            userId: string;
            ytdInterestPaid?: number;
            ytdPrincipalPaid?: number;
        }[], string | undefined>;
        getStudentLoanLiabilityByAccount: import("convex/server").FunctionReference<"query", "internal", {
            accountId: string;
        }, {
            _id: string;
            accountId: string;
            accountNumber?: string;
            createdAt: number;
            disbursementDates?: Array<string>;
            expectedPayoffDate?: string;
            guarantor?: string;
            interestRatePercentage: number;
            isOverdue?: boolean;
            lastPaymentAmount?: number;
            lastPaymentDate?: string;
            lastStatementBalance?: number;
            lastStatementIssueDate?: string;
            loanName?: string;
            loanStatus?: {
                endDate?: string;
                type?: string;
            };
            minimumPaymentAmount?: number;
            nextPaymentDueDate?: string;
            originationDate?: string;
            originationPrincipalAmount?: number;
            outstandingInterestAmount?: number;
            paymentReferenceNumber?: string;
            plaidItemId: string;
            repaymentPlan?: {
                description?: string;
                type?: string;
            };
            sequenceNumber?: string;
            servicerAddress?: {
                city?: string;
                country?: string;
                postalCode?: string;
                region?: string;
                street?: string;
            };
            updatedAt: number;
            userId: string;
            ytdInterestPaid?: number;
            ytdPrincipalPaid?: number;
        } | null, string | undefined>;
        getSubscriptionsSummary: import("convex/server").FunctionReference<"query", "internal", {
            userId: string;
        }, {
            annualCount: number;
            biweeklyCount: number;
            count: number;
            monthlyCount: number;
            monthlyTotal: number;
            weeklyCount: number;
        }, string | undefined>;
        getSyncLogsByItem: import("convex/server").FunctionReference<"query", "internal", {
            limit?: number;
            plaidItemId: string;
        }, {
            _id: string;
            completedAt?: number;
            durationMs?: number;
            errorCode?: string;
            errorMessage?: string;
            plaidItemId: string;
            result?: {
                accountsUpdated?: number;
                creditCardsUpdated?: number;
                mortgagesUpdated?: number;
                streamsUpdated?: number;
                studentLoansUpdated?: number;
                transactionsAdded?: number;
                transactionsModified?: number;
                transactionsRemoved?: number;
            };
            retryCount?: number;
            startedAt: number;
            status: string;
            syncType: string;
            trigger: string;
            userId: string;
        }[], string | undefined>;
        getSyncLogsByUser: import("convex/server").FunctionReference<"query", "internal", {
            limit?: number;
            userId: string;
        }, {
            _id: string;
            completedAt?: number;
            durationMs?: number;
            errorCode?: string;
            errorMessage?: string;
            plaidItemId: string;
            result?: {
                accountsUpdated?: number;
                creditCardsUpdated?: number;
                mortgagesUpdated?: number;
                streamsUpdated?: number;
                studentLoansUpdated?: number;
                transactionsAdded?: number;
                transactionsModified?: number;
                transactionsRemoved?: number;
            };
            retryCount?: number;
            startedAt: number;
            status: string;
            syncType: string;
            trigger: string;
            userId: string;
        }[], string | undefined>;
        getSyncStats: import("convex/server").FunctionReference<"query", "internal", {
            daysBack?: number;
            plaidItemId: string;
        }, {
            averageDurationMs?: number;
            errorCount: number;
            lastErrorAt?: number;
            lastErrorMessage?: string;
            lastSuccessAt?: number;
            lastSyncAt?: number;
            successCount: number;
            successRate: number;
            totalSyncs: number;
        }, string | undefined>;
        getTransactionsByAccount: import("convex/server").FunctionReference<"query", "internal", {
            accountId: string;
            limit?: number;
        }, {
            _id: string;
            accountId: string;
            amount: number;
            categoryDetailed?: string;
            categoryPrimary?: string;
            createdAt: number;
            date: string;
            datetime?: string;
            isoCurrencyCode: string;
            merchantName?: string;
            name: string;
            pending: boolean;
            plaidItemId: string;
            transactionId: string;
            userId: string;
        }[], string | undefined>;
        getTransactionsByUser: import("convex/server").FunctionReference<"query", "internal", {
            endDate?: string;
            limit?: number;
            startDate?: string;
            userId: string;
        }, {
            _id: string;
            accountId: string;
            amount: number;
            categoryDetailed?: string;
            categoryPrimary?: string;
            createdAt: number;
            date: string;
            datetime?: string;
            isoCurrencyCode: string;
            merchantName?: string;
            name: string;
            pending: boolean;
            plaidItemId: string;
            transactionId: string;
            userId: string;
        }[], string | undefined>;
        setPlaidItemActive: import("convex/server").FunctionReference<"mutation", "internal", {
            isActive: boolean;
            itemId: string;
        }, null, string | undefined>;
        togglePlaidItemActive: import("convex/server").FunctionReference<"mutation", "internal", {
            itemId: string;
        }, {
            isActive: boolean;
        }, string | undefined>;
    };
}
/**
 * Register Plaid webhook routes with the HTTP router.
 *
 * Handles:
 * - JWT signature verification (when plaidConfig provided)
 * - Auto-sync triggers for SYNC_UPDATES_AVAILABLE
 * - Item status updates for errors and re-auth
 * - Liabilities sync triggers
 *
 * @param http - The HTTP router instance
 * @param component - The Plaid component API
 * @param config - Configuration including plaidConfig for verification and sync
 *
 * @example
 * ```typescript
 * // convex/http.ts
 * import { httpRouter } from "convex/server";
 * import { registerRoutes } from "@crowdevelopment/convex-plaid";
 * import { components } from "./_generated/api";
 *
 * const http = httpRouter();
 *
 * registerRoutes(http, components.plaid, {
 *   webhookPath: "/plaid/webhook",
 *   plaidConfig: {
 *     PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID!,
 *     PLAID_SECRET: process.env.PLAID_SECRET!,
 *     PLAID_ENV: process.env.PLAID_ENV!,
 *     ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
 *   },
 * });
 *
 * export default http;
 * ```
 */
export declare function registerRoutes(http: HttpRouter, component: ComponentApi, config?: RegisterRoutesConfig): void;
export default Plaid;
//# sourceMappingURL=index.d.ts.map