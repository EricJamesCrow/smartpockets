/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent_budgets from "../agent/budgets.js";
import type * as agent_compaction from "../agent/compaction.js";
import type * as agent_config from "../agent/config.js";
import type * as agent_context from "../agent/context.js";
import type * as agent_errors from "../agent/errors.js";
import type * as agent_functions from "../agent/functions.js";
import type * as agent_liveRows from "../agent/liveRows.js";
import type * as agent_proposals from "../agent/proposals.js";
import type * as agent_rag from "../agent/rag.js";
import type * as agent_rateLimits from "../agent/rateLimits.js";
import type * as agent_registry from "../agent/registry.js";
import type * as agent_runtime from "../agent/runtime.js";
import type * as agent_system from "../agent/system.js";
import type * as agent_threads from "../agent/threads.js";
import type * as agent_titling from "../agent/titling.js";
import type * as agent_tools_execute_cancelProposal from "../agent/tools/execute/cancelProposal.js";
import type * as agent_tools_execute_executeConfirmedProposal from "../agent/tools/execute/executeConfirmedProposal.js";
import type * as agent_tools_execute_triggerPlaidResync from "../agent/tools/execute/triggerPlaidResync.js";
import type * as agent_tools_execute_undoMutation from "../agent/tools/execute/undoMutation.js";
import type * as agent_tools_propose_proposeBulkTransactionUpdate from "../agent/tools/propose/proposeBulkTransactionUpdate.js";
import type * as agent_tools_propose_proposeCreditCardMetadataUpdate from "../agent/tools/propose/proposeCreditCardMetadataUpdate.js";
import type * as agent_tools_propose_proposeManualPromo from "../agent/tools/propose/proposeManualPromo.js";
import type * as agent_tools_propose_proposeReminderCreate from "../agent/tools/propose/proposeReminderCreate.js";
import type * as agent_tools_propose_proposeReminderDelete from "../agent/tools/propose/proposeReminderDelete.js";
import type * as agent_tools_propose_proposeTransactionUpdate from "../agent/tools/propose/proposeTransactionUpdate.js";
import type * as agent_tools_read_getAccountDetail from "../agent/tools/read/getAccountDetail.js";
import type * as agent_tools_read_getCreditCardDetail from "../agent/tools/read/getCreditCardDetail.js";
import type * as agent_tools_read_getPlaidHealth from "../agent/tools/read/getPlaidHealth.js";
import type * as agent_tools_read_getProposal from "../agent/tools/read/getProposal.js";
import type * as agent_tools_read_getSpendByCategory from "../agent/tools/read/getSpendByCategory.js";
import type * as agent_tools_read_getSpendOverTime from "../agent/tools/read/getSpendOverTime.js";
import type * as agent_tools_read_getTransactionDetail from "../agent/tools/read/getTransactionDetail.js";
import type * as agent_tools_read_getUpcomingStatements from "../agent/tools/read/getUpcomingStatements.js";
import type * as agent_tools_read_listAccounts from "../agent/tools/read/listAccounts.js";
import type * as agent_tools_read_listCreditCards from "../agent/tools/read/listCreditCards.js";
import type * as agent_tools_read_listDeferredInterestPromos from "../agent/tools/read/listDeferredInterestPromos.js";
import type * as agent_tools_read_listInstallmentPlans from "../agent/tools/read/listInstallmentPlans.js";
import type * as agent_tools_read_listReminders from "../agent/tools/read/listReminders.js";
import type * as agent_tools_read_listTransactions from "../agent/tools/read/listTransactions.js";
import type * as agent_tools_read_moneyPreview from "../agent/tools/read/moneyPreview.js";
import type * as agent_tools_read_searchMerchants from "../agent/tools/read/searchMerchants.js";
import type * as agent_usage from "../agent/usage.js";
import type * as agent_writeTool from "../agent/writeTool.js";
import type * as creditCards_actions from "../creditCards/actions.js";
import type * as creditCards_mutations from "../creditCards/mutations.js";
import type * as creditCards_queries from "../creditCards/queries.js";
import type * as creditCards_validators from "../creditCards/validators.js";
import type * as crons from "../crons.js";
import type * as dashboard_index from "../dashboard/index.js";
import type * as dashboard_queries from "../dashboard/queries.js";
import type * as email_clerk from "../email/clerk.js";
import type * as email_crons from "../email/crons.js";
import type * as email_dispatch from "../email/dispatch.js";
import type * as email_events from "../email/events.js";
import type * as email_internal from "../email/internal.js";
import type * as email_middleware from "../email/middleware.js";
import type * as email_mutations from "../email/mutations.js";
import type * as email_queries from "../email/queries.js";
import type * as email_resend from "../email/resend.js";
import type * as email_send from "../email/send.js";
import type * as email_templates from "../email/templates.js";
import type * as email_unsubscribeToken from "../email/unsubscribeToken.js";
import type * as email_workflow from "../email/workflow.js";
import type * as email_workflows from "../email/workflows.js";
import type * as functions from "../functions.js";
import type * as http from "../http.js";
import type * as installmentPlans_mutations from "../installmentPlans/mutations.js";
import type * as installmentPlans_queries from "../installmentPlans/queries.js";
import type * as intelligence_anomalies_mutations from "../intelligence/anomalies/mutations.js";
import type * as intelligence_anomalies_queries from "../intelligence/anomalies/queries.js";
import type * as intelligence_anomalies_rules from "../intelligence/anomalies/rules.js";
import type * as intelligence_anomalies_scan from "../intelligence/anomalies/scan.js";
import type * as intelligence_cashflow_compute from "../intelligence/cashflow/compute.js";
import type * as intelligence_cashflow_queries from "../intelligence/cashflow/queries.js";
import type * as intelligence_cashflow_refresh from "../intelligence/cashflow/refresh.js";
import type * as intelligence_promoCountdowns_helpers from "../intelligence/promoCountdowns/helpers.js";
import type * as intelligence_promoCountdowns_queries from "../intelligence/promoCountdowns/queries.js";
import type * as intelligence_promoCountdowns_refresh from "../intelligence/promoCountdowns/refresh.js";
import type * as intelligence_statementReminders_helpers from "../intelligence/statementReminders/helpers.js";
import type * as intelligence_statementReminders_queries from "../intelligence/statementReminders/queries.js";
import type * as intelligence_statementReminders_scan from "../intelligence/statementReminders/scan.js";
import type * as intelligence_subscriptions_mutations from "../intelligence/subscriptions/mutations.js";
import type * as intelligence_subscriptions_normalize from "../intelligence/subscriptions/normalize.js";
import type * as intelligence_subscriptions_queries from "../intelligence/subscriptions/queries.js";
import type * as intelligence_subscriptions_scan from "../intelligence/subscriptions/scan.js";
import type * as items_index from "../items/index.js";
import type * as items_mutations from "../items/mutations.js";
import type * as items_queries from "../items/queries.js";
import type * as lib_plaidWebhookVerification from "../lib/plaidWebhookVerification.js";
import type * as migrations_seedPromptVersion from "../migrations/seedPromptVersion.js";
import type * as money from "../money.js";
import type * as notifications_hashing from "../notifications/hashing.js";
import type * as paymentAttemptTypes from "../paymentAttemptTypes.js";
import type * as paymentAttempts from "../paymentAttempts.js";
import type * as plaid_errorTaxonomy from "../plaid/errorTaxonomy.js";
import type * as plaid_persistentError from "../plaid/persistentError.js";
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
  "agent/budgets": typeof agent_budgets;
  "agent/compaction": typeof agent_compaction;
  "agent/config": typeof agent_config;
  "agent/context": typeof agent_context;
  "agent/errors": typeof agent_errors;
  "agent/functions": typeof agent_functions;
  "agent/liveRows": typeof agent_liveRows;
  "agent/proposals": typeof agent_proposals;
  "agent/rag": typeof agent_rag;
  "agent/rateLimits": typeof agent_rateLimits;
  "agent/registry": typeof agent_registry;
  "agent/runtime": typeof agent_runtime;
  "agent/system": typeof agent_system;
  "agent/threads": typeof agent_threads;
  "agent/titling": typeof agent_titling;
  "agent/tools/execute/cancelProposal": typeof agent_tools_execute_cancelProposal;
  "agent/tools/execute/executeConfirmedProposal": typeof agent_tools_execute_executeConfirmedProposal;
  "agent/tools/execute/triggerPlaidResync": typeof agent_tools_execute_triggerPlaidResync;
  "agent/tools/execute/undoMutation": typeof agent_tools_execute_undoMutation;
  "agent/tools/propose/proposeBulkTransactionUpdate": typeof agent_tools_propose_proposeBulkTransactionUpdate;
  "agent/tools/propose/proposeCreditCardMetadataUpdate": typeof agent_tools_propose_proposeCreditCardMetadataUpdate;
  "agent/tools/propose/proposeManualPromo": typeof agent_tools_propose_proposeManualPromo;
  "agent/tools/propose/proposeReminderCreate": typeof agent_tools_propose_proposeReminderCreate;
  "agent/tools/propose/proposeReminderDelete": typeof agent_tools_propose_proposeReminderDelete;
  "agent/tools/propose/proposeTransactionUpdate": typeof agent_tools_propose_proposeTransactionUpdate;
  "agent/tools/read/getAccountDetail": typeof agent_tools_read_getAccountDetail;
  "agent/tools/read/getCreditCardDetail": typeof agent_tools_read_getCreditCardDetail;
  "agent/tools/read/getPlaidHealth": typeof agent_tools_read_getPlaidHealth;
  "agent/tools/read/getProposal": typeof agent_tools_read_getProposal;
  "agent/tools/read/getSpendByCategory": typeof agent_tools_read_getSpendByCategory;
  "agent/tools/read/getSpendOverTime": typeof agent_tools_read_getSpendOverTime;
  "agent/tools/read/getTransactionDetail": typeof agent_tools_read_getTransactionDetail;
  "agent/tools/read/getUpcomingStatements": typeof agent_tools_read_getUpcomingStatements;
  "agent/tools/read/listAccounts": typeof agent_tools_read_listAccounts;
  "agent/tools/read/listCreditCards": typeof agent_tools_read_listCreditCards;
  "agent/tools/read/listDeferredInterestPromos": typeof agent_tools_read_listDeferredInterestPromos;
  "agent/tools/read/listInstallmentPlans": typeof agent_tools_read_listInstallmentPlans;
  "agent/tools/read/listReminders": typeof agent_tools_read_listReminders;
  "agent/tools/read/listTransactions": typeof agent_tools_read_listTransactions;
  "agent/tools/read/moneyPreview": typeof agent_tools_read_moneyPreview;
  "agent/tools/read/searchMerchants": typeof agent_tools_read_searchMerchants;
  "agent/usage": typeof agent_usage;
  "agent/writeTool": typeof agent_writeTool;
  "creditCards/actions": typeof creditCards_actions;
  "creditCards/mutations": typeof creditCards_mutations;
  "creditCards/queries": typeof creditCards_queries;
  "creditCards/validators": typeof creditCards_validators;
  crons: typeof crons;
  "dashboard/index": typeof dashboard_index;
  "dashboard/queries": typeof dashboard_queries;
  "email/clerk": typeof email_clerk;
  "email/crons": typeof email_crons;
  "email/dispatch": typeof email_dispatch;
  "email/events": typeof email_events;
  "email/internal": typeof email_internal;
  "email/middleware": typeof email_middleware;
  "email/mutations": typeof email_mutations;
  "email/queries": typeof email_queries;
  "email/resend": typeof email_resend;
  "email/send": typeof email_send;
  "email/templates": typeof email_templates;
  "email/unsubscribeToken": typeof email_unsubscribeToken;
  "email/workflow": typeof email_workflow;
  "email/workflows": typeof email_workflows;
  functions: typeof functions;
  http: typeof http;
  "installmentPlans/mutations": typeof installmentPlans_mutations;
  "installmentPlans/queries": typeof installmentPlans_queries;
  "intelligence/anomalies/mutations": typeof intelligence_anomalies_mutations;
  "intelligence/anomalies/queries": typeof intelligence_anomalies_queries;
  "intelligence/anomalies/rules": typeof intelligence_anomalies_rules;
  "intelligence/anomalies/scan": typeof intelligence_anomalies_scan;
  "intelligence/cashflow/compute": typeof intelligence_cashflow_compute;
  "intelligence/cashflow/queries": typeof intelligence_cashflow_queries;
  "intelligence/cashflow/refresh": typeof intelligence_cashflow_refresh;
  "intelligence/promoCountdowns/helpers": typeof intelligence_promoCountdowns_helpers;
  "intelligence/promoCountdowns/queries": typeof intelligence_promoCountdowns_queries;
  "intelligence/promoCountdowns/refresh": typeof intelligence_promoCountdowns_refresh;
  "intelligence/statementReminders/helpers": typeof intelligence_statementReminders_helpers;
  "intelligence/statementReminders/queries": typeof intelligence_statementReminders_queries;
  "intelligence/statementReminders/scan": typeof intelligence_statementReminders_scan;
  "intelligence/subscriptions/mutations": typeof intelligence_subscriptions_mutations;
  "intelligence/subscriptions/normalize": typeof intelligence_subscriptions_normalize;
  "intelligence/subscriptions/queries": typeof intelligence_subscriptions_queries;
  "intelligence/subscriptions/scan": typeof intelligence_subscriptions_scan;
  "items/index": typeof items_index;
  "items/mutations": typeof items_mutations;
  "items/queries": typeof items_queries;
  "lib/plaidWebhookVerification": typeof lib_plaidWebhookVerification;
  "migrations/seedPromptVersion": typeof migrations_seedPromptVersion;
  money: typeof money;
  "notifications/hashing": typeof notifications_hashing;
  paymentAttemptTypes: typeof paymentAttemptTypes;
  paymentAttempts: typeof paymentAttempts;
  "plaid/errorTaxonomy": typeof plaid_errorTaxonomy;
  "plaid/persistentError": typeof plaid_persistentError;
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
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  plaid: import("@crowdevelopment/convex-plaid/_generated/component.js").ComponentApi<"plaid">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  rag: import("@convex-dev/rag/_generated/component.js").ComponentApi<"rag">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
