/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as creditCards_actions from "../creditCards/actions.js";
import type * as creditCards_mutations from "../creditCards/mutations.js";
import type * as creditCards_queries from "../creditCards/queries.js";
import type * as creditCards_validators from "../creditCards/validators.js";
import type * as crons from "../crons.js";
import type * as dashboard_index from "../dashboard/index.js";
import type * as dashboard_queries from "../dashboard/queries.js";
import type * as email_clerk from "../email/clerk.js";
import type * as email_dispatch from "../email/dispatch.js";
import type * as email_events from "../email/events.js";
import type * as email_resend from "../email/resend.js";
import type * as email_send from "../email/send.js";
import type * as email_templates from "../email/templates.js";
import type * as plaid_errorTaxonomy from "../plaid/errorTaxonomy.js";
import type * as plaid_persistentError from "../plaid/persistentError.js";
import type * as functions from "../functions.js";
import type * as http from "../http.js";
import type * as installmentPlans_mutations from "../installmentPlans/mutations.js";
import type * as installmentPlans_queries from "../installmentPlans/queries.js";
import type * as items_index from "../items/index.js";
import type * as items_mutations from "../items/mutations.js";
import type * as items_queries from "../items/queries.js";
import type * as lib_plaidWebhookVerification from "../lib/plaidWebhookVerification.js";
import type * as members from "../members.js";
import type * as organizations from "../organizations.js";
import type * as paymentAttemptTypes from "../paymentAttemptTypes.js";
import type * as paymentAttempts from "../paymentAttempts.js";
import type * as permissions from "../permissions.js";
import type * as plaidComponent from "../plaidComponent.js";
import type * as promoRates_mutations from "../promoRates/mutations.js";
import type * as promoRates_queries from "../promoRates/queries.js";
import type * as statementSnapshots_actions from "../statementSnapshots/actions.js";
import type * as statementSnapshots_internalQueries from "../statementSnapshots/internalQueries.js";
import type * as statementSnapshots_mutations from "../statementSnapshots/mutations.js";
import type * as statementSnapshots_queries from "../statementSnapshots/queries.js";
import type * as transactionAttachments_mutations from "../transactionAttachments/mutations.js";
import type * as transactionAttachments_queries from "../transactionAttachments/queries.js";
import type * as transactionOverlays_index from "../transactionOverlays/index.js";
import type * as transactionOverlays_mutations from "../transactionOverlays/mutations.js";
import type * as transactionOverlays_queries from "../transactionOverlays/queries.js";
import type * as transactions_helpers from "../transactions/helpers.js";
import type * as transactions_index from "../transactions/index.js";
import type * as transactions_queries from "../transactions/queries.js";
import type * as types from "../types.js";
import type * as userPreferences from "../userPreferences.js";
import type * as users from "../users.js";
import type * as wallets_cardQueries from "../wallets/cardQueries.js";
import type * as wallets_mutations from "../wallets/mutations.js";
import type * as wallets_queries from "../wallets/queries.js";
import type * as wallets_walletCards from "../wallets/walletCards.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "creditCards/actions": typeof creditCards_actions;
  "creditCards/mutations": typeof creditCards_mutations;
  "creditCards/queries": typeof creditCards_queries;
  "creditCards/validators": typeof creditCards_validators;
  crons: typeof crons;
  "dashboard/index": typeof dashboard_index;
  "dashboard/queries": typeof dashboard_queries;
  "email/clerk": typeof email_clerk;
  "email/dispatch": typeof email_dispatch;
  "email/events": typeof email_events;
  "email/resend": typeof email_resend;
  "email/send": typeof email_send;
  "email/templates": typeof email_templates;
  "plaid/errorTaxonomy": typeof plaid_errorTaxonomy;
  "plaid/persistentError": typeof plaid_persistentError;
  functions: typeof functions;
  http: typeof http;
  "installmentPlans/mutations": typeof installmentPlans_mutations;
  "installmentPlans/queries": typeof installmentPlans_queries;
  "items/index": typeof items_index;
  "items/mutations": typeof items_mutations;
  "items/queries": typeof items_queries;
  "lib/plaidWebhookVerification": typeof lib_plaidWebhookVerification;
  members: typeof members;
  organizations: typeof organizations;
  paymentAttemptTypes: typeof paymentAttemptTypes;
  paymentAttempts: typeof paymentAttempts;
  permissions: typeof permissions;
  plaidComponent: typeof plaidComponent;
  "promoRates/mutations": typeof promoRates_mutations;
  "promoRates/queries": typeof promoRates_queries;
  "statementSnapshots/actions": typeof statementSnapshots_actions;
  "statementSnapshots/internalQueries": typeof statementSnapshots_internalQueries;
  "statementSnapshots/mutations": typeof statementSnapshots_mutations;
  "statementSnapshots/queries": typeof statementSnapshots_queries;
  "transactionAttachments/mutations": typeof transactionAttachments_mutations;
  "transactionAttachments/queries": typeof transactionAttachments_queries;
  "transactionOverlays/index": typeof transactionOverlays_index;
  "transactionOverlays/mutations": typeof transactionOverlays_mutations;
  "transactionOverlays/queries": typeof transactionOverlays_queries;
  "transactions/helpers": typeof transactions_helpers;
  "transactions/index": typeof transactions_index;
  "transactions/queries": typeof transactions_queries;
  types: typeof types;
  userPreferences: typeof userPreferences;
  users: typeof users;
  "wallets/cardQueries": typeof wallets_cardQueries;
  "wallets/mutations": typeof wallets_mutations;
  "wallets/queries": typeof wallets_queries;
  "wallets/walletCards": typeof wallets_walletCards;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  resend: {
    lib: {
      cancelEmail: FunctionReference<
        "mutation",
        "internal",
        { emailId: string },
        null
      >;
      cleanupAbandonedEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      cleanupOldEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      createManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          from: string;
          headers?: Array<{ name: string; value: string }>;
          replyTo?: Array<string>;
          subject: string;
          to: Array<string> | string;
        },
        string
      >;
      get: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          bcc?: Array<string>;
          bounced?: boolean;
          cc?: Array<string>;
          clicked?: boolean;
          complained: boolean;
          createdAt: number;
          deliveryDelayed?: boolean;
          errorMessage?: string;
          failed?: boolean;
          finalizedAt: number;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          opened: boolean;
          replyTo: Array<string>;
          resendId?: string;
          segment: number;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
          subject?: string;
          template?: {
            id: string;
            variables?: Record<string, string | number>;
          };
          text?: string;
          to: Array<string>;
        } | null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          bounced: boolean;
          clicked: boolean;
          complained: boolean;
          deliveryDelayed: boolean;
          errorMessage: string | null;
          failed: boolean;
          opened: boolean;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        } | null
      >;
      handleEmailEvent: FunctionReference<
        "mutation",
        "internal",
        { event: any },
        null
      >;
      sendEmail: FunctionReference<
        "mutation",
        "internal",
        {
          bcc?: Array<string>;
          cc?: Array<string>;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          options: {
            apiKey: string;
            initialBackoffMs: number;
            onEmailEvent?: { fnHandle: string };
            retryAttempts: number;
            testMode: boolean;
          };
          replyTo?: Array<string>;
          subject?: string;
          template?: {
            id: string;
            variables?: Record<string, string | number>;
          };
          text?: string;
          to: Array<string>;
        },
        string
      >;
      updateManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          emailId: string;
          errorMessage?: string;
          resendId?: string;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        },
        null
      >;
    };
  };
  plaid: {
    actions: {
      completeReauth: FunctionReference<
        "action",
        "internal",
        { plaidItemId: string },
        { success: boolean }
      >;
      createLinkToken: FunctionReference<
        "action",
        "internal",
        {
          accountFilters?: any;
          clientName?: string;
          countryCodes?: Array<string>;
          language?: string;
          plaidClientId: string;
          plaidEnv: string;
          plaidSecret: string;
          products?: Array<string>;
          userId: string;
          webhookUrl?: string;
        },
        { linkToken: string }
      >;
      createUpdateLinkToken: FunctionReference<
        "action",
        "internal",
        {
          encryptionKey: string;
          mode?: "reauth" | "account_select";
          plaidClientId: string;
          plaidEnv: string;
          plaidItemId: string;
          plaidSecret: string;
        },
        { linkToken: string }
      >;
      enrichTransactions: FunctionReference<
        "action",
        "internal",
        {
          encryptionKey: string;
          plaidClientId: string;
          plaidEnv: string;
          plaidSecret: string;
          transactions: Array<{
            amount: number;
            description: string;
            direction: "INFLOW" | "OUTFLOW";
            id: string;
            iso_currency_code?: string;
            location?: {
              city?: string;
              country?: string;
              postal_code?: string;
              region?: string;
            };
            mcc?: string;
          }>;
        },
        { enriched: number; failed: number }
      >;
      exchangePublicToken: FunctionReference<
        "action",
        "internal",
        {
          encryptionKey: string;
          plaidClientId: string;
          plaidEnv: string;
          plaidSecret: string;
          products?: Array<string>;
          publicToken: string;
          userId: string;
        },
        { itemId: string; plaidItemId: string; success: boolean }
      >;
      fetchAccounts: FunctionReference<
        "action",
        "internal",
        {
          encryptionKey: string;
          plaidClientId: string;
          plaidEnv: string;
          plaidItemId: string;
          plaidSecret: string;
        },
        { accountCount: number }
      >;
      fetchLiabilities: FunctionReference<
        "action",
        "internal",
        {
          encryptionKey: string;
          plaidClientId: string;
          plaidEnv: string;
          plaidItemId: string;
          plaidSecret: string;
        },
        { creditCards: number; mortgages: number; studentLoans: number }
      >;
      fetchRecurringStreams: FunctionReference<
        "action",
        "internal",
        {
          encryptionKey: string;
          plaidClientId: string;
          plaidEnv: string;
          plaidItemId: string;
          plaidSecret: string;
        },
        { inflows: number; outflows: number }
      >;
      syncTransactions: FunctionReference<
        "action",
        "internal",
        {
          encryptionKey: string;
          maxPages?: number;
          maxTransactions?: number;
          plaidClientId: string;
          plaidEnv: string;
          plaidItemId: string;
          plaidSecret: string;
        },
        {
          added: number;
          cursor: string;
          hasMore: boolean;
          modified: number;
          pagesProcessed: number;
          removed: number;
          skipReason?: string;
          skipped?: boolean;
        }
      >;
      triggerTransactionsRefresh: FunctionReference<
        "action",
        "internal",
        {
          encryptionKey: string;
          plaidClientId: string;
          plaidEnv: string;
          plaidItemId: string;
          plaidSecret: string;
        },
        { error?: string; requestId?: string; success: boolean }
      >;
    };
    private: {
      setNewAccountsAvailableInternal: FunctionReference<
        "mutation",
        "internal",
        { plaidItemId: string },
        null
      >;
      clearNewAccountsAvailableInternal: FunctionReference<
        "mutation",
        "internal",
        { plaidItemId: string },
        null
      >;
      markFirstErrorAtInternal: FunctionReference<
        "mutation",
        "internal",
        { plaidItemId: string },
        null
      >;
      clearErrorTrackingInternal: FunctionReference<
        "mutation",
        "internal",
        { plaidItemId: string },
        null
      >;
      markItemErrorDispatchedInternal: FunctionReference<
        "mutation",
        "internal",
        { plaidItemId: string },
        null
      >;
      listErrorItemsInternal: FunctionReference<
        "query",
        "internal",
        { olderThanLastSyncedAt: number; dispatchedBefore: number },
        Array<{
          plaidItemId: string;
          userId: string;
          institutionName: string | null;
          firstErrorAt: number | null;
          errorAt: number | null;
          errorCode: string | null;
        }>
      >;
    };
    public: {
      deletePlaidItem: FunctionReference<
        "mutation",
        "internal",
        { plaidItemId: string },
        { message: string; status: "scheduled" | "not_found" }
      >;
      getAccountsByItem: FunctionReference<
        "query",
        "internal",
        { plaidItemId: string },
        Array<{
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
        }>
      >;
      getAccountsByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
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
        }>
      >;
      getActiveSubscriptions: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
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
        }>
      >;
      getAllActiveItems: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          _id: string;
          _creationTime: number;
          activatedAt?: number;
          circuitState?: string;
          consecutiveFailures?: number;
          createdAt: number;
          disconnectedAt?: number;
          disconnectedReason?: string;
          errorAt?: number;
          errorCode?: string;
          errorMessage?: string;
          firstErrorAt?: number;
          institutionId?: string;
          institutionName?: string;
          isActive?: boolean;
          itemId: string;
          lastDispatchedAt?: number;
          lastFailureAt?: number;
          lastSyncedAt?: number;
          newAccountsAvailableAt?: number;
          nextRetryAt?: number;
          products: Array<string>;
          reauthAt?: number;
          reauthReason?: string;
          status: string;
          syncError?: string;
          userId: string;
        }>
      >;
      getAllInstitutions: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          _id: string;
          institutionId: string;
          lastFetched: number;
          logo?: string;
          name: string;
          primaryColor?: string;
          products?: Array<string>;
          url?: string;
        }>
      >;
      getInstitution: FunctionReference<
        "query",
        "internal",
        { institutionId: string },
        {
          _id: string;
          institutionId: string;
          lastFetched: number;
          logo?: string;
          name: string;
          primaryColor?: string;
          products?: Array<string>;
          url?: string;
        } | null
      >;
      getItem: FunctionReference<
        "query",
        "internal",
        { plaidItemId: string },
        {
          _id: string;
          _creationTime: number;
          activatedAt?: number;
          circuitState?: string;
          consecutiveFailures?: number;
          createdAt: number;
          disconnectedAt?: number;
          disconnectedReason?: string;
          errorAt?: number;
          errorCode?: string;
          errorMessage?: string;
          firstErrorAt?: number;
          institutionId?: string;
          institutionName?: string;
          isActive?: boolean;
          itemId: string;
          lastDispatchedAt?: number;
          lastFailureAt?: number;
          lastSyncedAt?: number;
          newAccountsAvailableAt?: number;
          nextRetryAt?: number;
          products: Array<string>;
          reauthAt?: number;
          reauthReason?: string;
          status: string;
          syncError?: string;
          userId: string;
        } | null
      >;
      getItemByPlaidItemId: FunctionReference<
        "query",
        "internal",
        { itemId: string },
        {
          _id: string;
          _creationTime: number;
          activatedAt?: number;
          circuitState?: string;
          consecutiveFailures?: number;
          createdAt: number;
          disconnectedAt?: number;
          disconnectedReason?: string;
          errorAt?: number;
          errorCode?: string;
          errorMessage?: string;
          firstErrorAt?: number;
          institutionId?: string;
          institutionName?: string;
          isActive?: boolean;
          itemId: string;
          lastDispatchedAt?: number;
          lastFailureAt?: number;
          lastSyncedAt?: number;
          newAccountsAvailableAt?: number;
          nextRetryAt?: number;
          products: Array<string>;
          reauthAt?: number;
          reauthReason?: string;
          status: string;
          syncError?: string;
          userId: string;
        } | null
      >;
      getItemsByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          _id: string;
          _creationTime: number;
          activatedAt?: number;
          circuitState?: string;
          consecutiveFailures?: number;
          createdAt: number;
          disconnectedAt?: number;
          disconnectedReason?: string;
          errorAt?: number;
          errorCode?: string;
          errorMessage?: string;
          firstErrorAt?: number;
          institutionId?: string;
          institutionName?: string;
          isActive?: boolean;
          itemId: string;
          lastDispatchedAt?: number;
          lastFailureAt?: number;
          lastSyncedAt?: number;
          newAccountsAvailableAt?: number;
          nextRetryAt?: number;
          products: Array<string>;
          reauthAt?: number;
          reauthReason?: string;
          status: string;
          syncError?: string;
          userId: string;
        }>
      >;
      getItemHealth: FunctionReference<
        "query",
        "internal",
        { plaidItemId: string },
        {
          plaidItemId: string;
          itemId: string;
          state: "syncing" | "ready" | "error" | "re-consent-required";
          recommendedAction:
            | "reconnect"
            | "reconnect_for_new_accounts"
            | "wait"
            | "contact_support"
            | null;
          reasonCode:
            | "healthy"
            | "syncing_initial"
            | "syncing_incremental"
            | "auth_required_login"
            | "auth_required_expiration"
            | "transient_circuit_open"
            | "transient_institution_down"
            | "transient_rate_limited"
            | "permanent_invalid_token"
            | "permanent_item_not_found"
            | "permanent_no_accounts"
            | "permanent_access_not_granted"
            | "permanent_products_not_supported"
            | "permanent_institution_unsupported"
            | "permanent_revoked"
            | "permanent_unknown"
            | "new_accounts_available";
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
        }
      >;
      getItemHealthByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          plaidItemId: string;
          itemId: string;
          state: "syncing" | "ready" | "error" | "re-consent-required";
          recommendedAction:
            | "reconnect"
            | "reconnect_for_new_accounts"
            | "wait"
            | "contact_support"
            | null;
          reasonCode:
            | "healthy"
            | "syncing_initial"
            | "syncing_incremental"
            | "auth_required_login"
            | "auth_required_expiration"
            | "transient_circuit_open"
            | "transient_institution_down"
            | "transient_rate_limited"
            | "permanent_invalid_token"
            | "permanent_item_not_found"
            | "permanent_no_accounts"
            | "permanent_access_not_granted"
            | "permanent_products_not_supported"
            | "permanent_institution_unsupported"
            | "permanent_revoked"
            | "permanent_unknown"
            | "new_accounts_available";
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
        }>
      >;
      getLiabilitiesByItem: FunctionReference<
        "query",
        "internal",
        { plaidItemId: string },
        Array<{
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
        }>
      >;
      getLiabilitiesByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
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
        }>
      >;
      getMerchantEnrichment: FunctionReference<
        "query",
        "internal",
        { merchantId: string },
        {
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
        } | null
      >;
      getMortgageLiabilitiesByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
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
        }>
      >;
      getMortgageLiabilityByAccount: FunctionReference<
        "query",
        "internal",
        { accountId: string },
        {
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
        } | null
      >;
      getRecurringIncome: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
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
        }>
      >;
      getRecurringStreamsByItem: FunctionReference<
        "query",
        "internal",
        { plaidItemId: string },
        Array<{
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
        }>
      >;
      getRecurringStreamsByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
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
        }>
      >;
      getStudentLoanLiabilitiesByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
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
          loanStatus?: { endDate?: string; type?: string };
          minimumPaymentAmount?: number;
          nextPaymentDueDate?: string;
          originationDate?: string;
          originationPrincipalAmount?: number;
          outstandingInterestAmount?: number;
          paymentReferenceNumber?: string;
          plaidItemId: string;
          repaymentPlan?: { description?: string; type?: string };
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
        }>
      >;
      getStudentLoanLiabilityByAccount: FunctionReference<
        "query",
        "internal",
        { accountId: string },
        {
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
          loanStatus?: { endDate?: string; type?: string };
          minimumPaymentAmount?: number;
          nextPaymentDueDate?: string;
          originationDate?: string;
          originationPrincipalAmount?: number;
          outstandingInterestAmount?: number;
          paymentReferenceNumber?: string;
          plaidItemId: string;
          repaymentPlan?: { description?: string; type?: string };
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
        } | null
      >;
      getSubscriptionsSummary: FunctionReference<
        "query",
        "internal",
        { userId: string },
        {
          annualCount: number;
          biweeklyCount: number;
          count: number;
          monthlyCount: number;
          monthlyTotal: number;
          weeklyCount: number;
        }
      >;
      getSyncLogsByItem: FunctionReference<
        "query",
        "internal",
        { limit?: number; plaidItemId: string },
        Array<{
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
        }>
      >;
      getSyncLogsByUser: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        Array<{
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
        }>
      >;
      getSyncStats: FunctionReference<
        "query",
        "internal",
        { daysBack?: number; plaidItemId: string },
        {
          averageDurationMs?: number;
          errorCount: number;
          lastErrorAt?: number;
          lastErrorMessage?: string;
          lastSuccessAt?: number;
          lastSyncAt?: number;
          successCount: number;
          successRate: number;
          totalSyncs: number;
        }
      >;
      getTransactionsByAccount: FunctionReference<
        "query",
        "internal",
        { accountId: string; limit?: number },
        Array<{
          _id: string;
          accountId: string;
          amount: number;
          categoryDetailed?: string;
          categoryPrimary?: string;
          createdAt: number;
          date: string;
          datetime?: string;
          enrichmentData?: {
            counterpartyConfidence?: string;
            counterpartyEntityId?: string;
            counterpartyLogoUrl?: string;
            counterpartyName?: string;
            counterpartyPhoneNumber?: string;
            counterpartyType?: string;
            counterpartyWebsite?: string;
            enrichedAt?: number;
          };
          isoCurrencyCode: string;
          merchantId?: string;
          merchantName?: string;
          name: string;
          pending: boolean;
          plaidItemId: string;
          transactionId: string;
          userId: string;
        }>
      >;
      getTransactionsByUser: FunctionReference<
        "query",
        "internal",
        {
          endDate?: string;
          limit?: number;
          startDate?: string;
          userId: string;
        },
        Array<{
          _id: string;
          accountId: string;
          amount: number;
          categoryDetailed?: string;
          categoryPrimary?: string;
          createdAt: number;
          date: string;
          datetime?: string;
          enrichmentData?: {
            counterpartyConfidence?: string;
            counterpartyEntityId?: string;
            counterpartyLogoUrl?: string;
            counterpartyName?: string;
            counterpartyPhoneNumber?: string;
            counterpartyType?: string;
            counterpartyWebsite?: string;
            enrichedAt?: number;
          };
          isoCurrencyCode: string;
          merchantId?: string;
          merchantName?: string;
          name: string;
          pending: boolean;
          plaidItemId: string;
          transactionId: string;
          userId: string;
        }>
      >;
      setPlaidItemActive: FunctionReference<
        "mutation",
        "internal",
        { isActive: boolean; itemId: string },
        null
      >;
      togglePlaidItemActive: FunctionReference<
        "mutation",
        "internal",
        { itemId: string },
        { isActive: boolean }
      >;
    };
    testAuth: {
      testAuth: FunctionReference<"query", "internal", {}, any>;
    };
  };
};
