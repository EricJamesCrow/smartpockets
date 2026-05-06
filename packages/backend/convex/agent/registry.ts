import { z } from "zod";
import { internal } from "../_generated/api";
import type { BucketName } from "./rateLimits";

export type ToolCategory = "read" | "propose" | "execute" | "plaid" | "introspect";

export interface ToolDef {
    description: string;
    llmInputSchema: z.ZodTypeAny;
    handler: unknown;
    handlerType: "query" | "mutation";
    bucket: BucketName;
    ownership: "W2" | "W5" | "W6";
    category: ToolCategory;
    firstTurnGuard: boolean;
    incrementsReadCount: boolean;
}

const agent: any = (internal as any).agent;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDateString(value: string): boolean {
    if (!ISO_DATE_RE.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const isoDateSchema = z.string().refine(isIsoDateString, "Expected an ISO date in YYYY-MM-DD format.");

const manualPromoSchema = z
    .object({
        promoRateId: z.string().min(1).optional(),
        description: z.string().trim().min(1).max(160),
        aprPercentage: z.number().finite().min(0).max(100),
        originalBalance: z.number().finite().positive(),
        remainingBalance: z.number().finite().min(0),
        startDate: isoDateSchema,
        expirationDate: isoDateSchema,
        isDeferredInterest: z.boolean(),
    })
    .refine((promo) => promo.remainingBalance <= promo.originalBalance, {
        path: ["remainingBalance"],
        message: "remainingBalance must be less than or equal to originalBalance.",
    })
    .refine((promo) => promo.expirationDate >= promo.startDate, {
        path: ["expirationDate"],
        message: "expirationDate must be on or after startDate.",
    });

export const AGENT_TOOLS: Record<string, ToolDef> = {
    // ===== READ TOOLS (14) =====
    list_accounts: {
        description: "List the user's bank and credit card accounts, optionally filtered by type.",
        llmInputSchema: z.object({
            type: z
                .enum(["checking", "savings", "credit_card", "loan", "investment"])
                .optional()
                .describe("Filter to accounts of this type. Omit for all types."),
        }),
        handler: agent.tools.read.listAccounts.listAccounts,
        handlerType: "query" as const,
        bucket: "read_cheap" as const,
        ownership: "W2" as const,
        category: "read" as const,
        firstTurnGuard: false,
        incrementsReadCount: true,
    },
    get_account_detail: {
        description: "Get a single account's full detail including balances and metadata.",
        llmInputSchema: z.object({
            accountId: z.string().describe("Plaid account ID."),
        }),
        handler: agent.tools.read.getAccountDetail.getAccountDetail,
        handlerType: "query" as const,
        bucket: "read_cheap" as const,
        ownership: "W2" as const,
        category: "read" as const,
        firstTurnGuard: false,
        incrementsReadCount: true,
    },
    list_transactions: {
        description:
            "List transactions, optionally filtered by account, date range, and limit. Each row carries `amount` (Plaid convention), `displayAmount` (human convention number), `amountFormatted` (pre-formatted string like `+$550.47` or `-$117.87`), and `direction` (`inflow` or `outflow`). When echoing the amount to the user, copy `amountFormatted` VERBATIM and use `direction` to pick the verb (refund vs purchase) — never infer direction from merchant name.",
        llmInputSchema: z.object({
            accountId: z.string().optional(),
            dateFrom: z.string().optional().describe("ISO date (YYYY-MM-DD)"),
            dateTo: z.string().optional().describe("ISO date (YYYY-MM-DD)"),
            limit: z.number().int().max(500).optional(),
            presentation: z
                .enum(["widget", "inline"])
                .optional()
                .describe(
                    "Rendering hint. 'widget' (default) shows the full TransactionsTable component; use for broad exploration where the user wants to scan many rows. 'inline' suppresses the widget and expects you to summarize the relevant rows as a markdown table in your prose response; use for narrow questions like 'any new transactions?', 'show me my latest charges', 'find my X spending'.",
                ),
        }),
        handler: agent.tools.read.listTransactions.listTransactions,
        handlerType: "query" as const,
        bucket: "read_cheap" as const,
        ownership: "W2" as const,
        category: "read" as const,
        firstTurnGuard: false,
        incrementsReadCount: true,
    },
    get_transaction_detail: {
        description:
            "Get a single transaction's full detail including any user overlay. The `row` field carries `amount` (Plaid convention), `displayAmount` (human convention number), `amountFormatted` (pre-formatted string), and `direction` (`inflow`/`outflow`) — copy `amountFormatted` VERBATIM and use `direction` to pick the verb when echoing back to the user.",
        llmInputSchema: z.object({
            plaidTransactionId: z.string(),
        }),
        handler: agent.tools.read.getTransactionDetail.getTransactionDetail,
        handlerType: "query" as const,
        bucket: "read_cheap" as const,
        ownership: "W2" as const,
        category: "read" as const,
        firstTurnGuard: false,
        incrementsReadCount: true,
    },
    list_credit_cards: {
        description: "List the user's credit cards.",
        llmInputSchema: z.object({
            includeInactive: z.boolean().optional(),
        }),
        handler: agent.tools.read.listCreditCards.listCreditCards,
        handlerType: "query" as const,
        bucket: "read_cheap" as const,
        ownership: "W2" as const,
        category: "read" as const,
        firstTurnGuard: false,
        incrementsReadCount: true,
    },
    get_credit_card_detail: {
        description: "Get a credit card's full detail including APRs, balances, ISB, and YTD fees.",
        llmInputSchema: z.object({
            cardId: z.string().describe("Convex Ents ID for the credit card."),
        }),
        handler: agent.tools.read.getCreditCardDetail.getCreditCardDetail,
        handlerType: "query" as const,
        bucket: "read_moderate" as const,
        ownership: "W2" as const,
        category: "read" as const,
        firstTurnGuard: false,
        incrementsReadCount: true,
    },
    list_deferred_interest_promos: {
        description: "List active deferred-interest promos and their expiration dates.",
        llmInputSchema: z.object({
            includeExpired: z.boolean().optional(),
        }),
        handler: agent.tools.read.listDeferredInterestPromos.listDeferredInterestPromos,
        handlerType: "query" as const,
        bucket: "read_cheap" as const,
        ownership: "W2" as const,
        category: "read" as const,
        firstTurnGuard: false,
        incrementsReadCount: true,
    },
    list_installment_plans: {
        description: "List active installment plans tied to credit cards.",
        llmInputSchema: z.object({
            includeInactive: z.boolean().optional(),
        }),
        handler: agent.tools.read.listInstallmentPlans.listInstallmentPlans,
        handlerType: "query" as const,
        bucket: "read_cheap" as const,
        ownership: "W2" as const,
        category: "read" as const,
        firstTurnGuard: false,
        incrementsReadCount: true,
    },
    get_spend_by_category: {
        description:
            "Aggregate spending by category over a date range. Defaults to the last 30 days when dateFrom/dateTo are omitted.",
        llmInputSchema: z.object({
            dateFrom: z.string().optional().describe("ISO date (YYYY-MM-DD)"),
            dateTo: z.string().optional().describe("ISO date (YYYY-MM-DD)"),
            granularity: z.enum(["primary", "detailed"]).optional(),
        }),
        handler: agent.tools.read.getSpendByCategory.getSpendByCategory,
        handlerType: "query" as const,
        bucket: "read_moderate" as const,
        ownership: "W2" as const,
        category: "read" as const,
        firstTurnGuard: false,
        incrementsReadCount: true,
    },
    get_spend_over_time: {
        description:
            "Aggregate spending bucketed by day, week, or month. Defaults to the last 90 days bucketed by week when args are omitted.",
        llmInputSchema: z.object({
            dateFrom: z.string().optional().describe("ISO date (YYYY-MM-DD)"),
            dateTo: z.string().optional().describe("ISO date (YYYY-MM-DD)"),
            bucket: z.enum(["day", "week", "month"]).optional(),
        }),
        handler: agent.tools.read.getSpendOverTime.getSpendOverTime,
        handlerType: "query" as const,
        bucket: "read_moderate" as const,
        ownership: "W2" as const,
        category: "read" as const,
        firstTurnGuard: false,
        incrementsReadCount: true,
    },
    get_upcoming_statements: {
        description: "List credit cards with a statement closing in the next N days.",
        llmInputSchema: z.object({
            withinDays: z.number().int().max(90).optional(),
        }),
        handler: agent.tools.read.getUpcomingStatements.getUpcomingStatements,
        handlerType: "query" as const,
        bucket: "read_cheap" as const,
        ownership: "W2" as const,
        category: "read" as const,
        firstTurnGuard: false,
        incrementsReadCount: true,
    },
    list_reminders: {
        description: "List reminders, optionally filtered by done and date window.",
        llmInputSchema: z.object({
            includeDone: z.boolean().optional(),
            withinDays: z.number().int().max(365).optional(),
        }),
        handler: agent.tools.read.listReminders.listReminders,
        handlerType: "query" as const,
        bucket: "read_cheap" as const,
        ownership: "W2" as const,
        category: "read" as const,
        firstTurnGuard: false,
        incrementsReadCount: true,
    },
    search_merchants: {
        description:
            "Substring (case-insensitive) search for merchants by name across the user's transactions. Honors user-edited merchant names. Defaults window to last 90 days; returns merchants ranked by transaction count. Per-row carries `amountFormatted` and `direction` (copy verbatim / use direction for verb). Each merchant in `preview.merchants` carries `displayTotalAmount` (human convention) — quote that, not `totalAmount`.",
        llmInputSchema: z.object({
            query: z.string().min(1).max(128),
            dateFrom: z.string().optional().describe("ISO date (YYYY-MM-DD)"),
            dateTo: z.string().optional().describe("ISO date (YYYY-MM-DD)"),
            limit: z.number().int().max(50).optional(),
        }),
        handler: agent.tools.read.searchMerchants.searchMerchants,
        handlerType: "query" as const,
        bucket: "read_cheap" as const,
        ownership: "W2" as const,
        category: "read" as const,
        firstTurnGuard: false,
        incrementsReadCount: true,
    },
    get_plaid_health: {
        description:
            "Health summary for the user's linked bank connections. Surfaces per-item state (error, re-consent-required, syncing, ready), recommended action, and days since last sync.",
        llmInputSchema: z.object({}),
        handler: agent.tools.read.getPlaidHealth.getPlaidHealth,
        handlerType: "query" as const,
        bucket: "read_cheap" as const,
        ownership: "W2" as const,
        category: "plaid" as const,
        firstTurnGuard: false,
        incrementsReadCount: true,
    },

    // ===== PROPOSE TOOLS (6; W5 bodies) =====
    propose_transaction_update: {
        description: "Propose an update to a single transaction's overlay. User confirms before execute.",
        llmInputSchema: z.object({
            plaidTransactionId: z.string(),
            overlay: z.object({
                userCategory: z.string().optional(),
                notes: z.string().optional(),
                isHidden: z.boolean().optional(),
                isReviewed: z.boolean().optional(),
                userMerchantName: z.string().optional(),
            }),
        }),
        handler: agent.tools.propose.proposeTransactionUpdate.proposeTransactionUpdate,
        handlerType: "mutation" as const,
        bucket: "write_single" as const,
        ownership: "W5" as const,
        category: "propose" as const,
        firstTurnGuard: true,
        incrementsReadCount: false,
    },
    propose_bulk_transaction_update: {
        description: "Propose a bulk update to a filtered set of transactions. Returns a proposal the user must confirm before execute.",
        llmInputSchema: z.object({
            filter: z
                .object({
                    dateFrom: z.string().optional(),
                    dateTo: z.string().optional(),
                    merchantName: z.string().optional(),
                    categoryDetailed: z.array(z.string()).optional(),
                    accountIds: z.array(z.string()).optional(),
                    minAmount: z.number().optional(),
                    maxAmount: z.number().optional(),
                    pending: z.boolean().optional(),
                    isHidden: z.boolean().optional(),
                })
                .describe("Which transactions to target. At least one criterion required."),
            overlay: z.object({
                userCategory: z.string().optional(),
                userCategoryDetailed: z.string().optional(),
                notes: z.string().optional(),
                isHidden: z.boolean().optional(),
                userMerchantName: z.string().optional(),
                userDate: z.string().optional(),
                userTime: z.string().optional(),
            }),
            limit: z.number().int().max(1000).optional(),
        }),
        handler: agent.tools.propose.proposeBulkTransactionUpdate.proposeBulkTransactionUpdate,
        handlerType: "mutation" as const,
        bucket: "write_bulk" as const,
        ownership: "W5" as const,
        category: "propose" as const,
        firstTurnGuard: true,
        incrementsReadCount: false,
    },
    propose_credit_card_metadata_update: {
        description:
            "Propose an update to a credit card's metadata. Patchable: displayName (nickname), company (issuer), userOverrides (nested object — see field description for APR path).",
        llmInputSchema: z.object({
            cardId: z.string(),
            update: z
                .object({
                    displayName: z.string().optional(),
                    company: z.string().optional(),
                    userOverrides: z
                        .object({
                            officialName: z.string().optional(),
                            accountName: z.string().optional(),
                            company: z.string().optional(),
                            aprs: z
                                .array(
                                    z.object({
                                        index: z
                                            .number()
                                            .int()
                                            .describe(
                                                "0 = purchase APR, 1 = balance-transfer APR, etc.",
                                            ),
                                        aprPercentage: z
                                            .number()
                                            .optional()
                                            .describe(
                                                "As a percent, e.g. 0 for 0% intro, 21.99 for standard.",
                                            ),
                                        balanceSubjectToApr: z.number().optional(),
                                        interestChargeAmount: z.number().optional(),
                                    }),
                                )
                                .optional()
                                .describe(
                                    "APR overrides keyed by index. To set the purchase APR to 0%, send aprs: [{ index: 0, aprPercentage: 0 }].",
                                ),
                            providerDashboardUrl: z.string().optional(),
                        })
                        .optional()
                        .describe(
                            "User-set overrides for fields the user can correct manually (Plaid-sync'd values stay separate).",
                        ),
                })
                .passthrough(),
        }),
        handler: agent.tools.propose.proposeCreditCardMetadataUpdate.proposeCreditCardMetadataUpdate,
        handlerType: "mutation" as const,
        bucket: "write_single" as const,
        ownership: "W5" as const,
        category: "propose" as const,
        firstTurnGuard: true,
        incrementsReadCount: false,
    },
    propose_manual_promo: {
        description: "Propose adding a manual (user-entered) deferred-interest promo for a card.",
        llmInputSchema: z.object({
            cardId: z.string(),
            promo: manualPromoSchema,
        }),
        handler: agent.tools.propose.proposeManualPromo.proposeManualPromo,
        handlerType: "mutation" as const,
        bucket: "write_single" as const,
        ownership: "W5" as const,
        category: "propose" as const,
        firstTurnGuard: true,
        incrementsReadCount: false,
    },
    propose_reminder_create: {
        description: "Propose creating a reminder for the user.",
        llmInputSchema: z.object({
            reminder: z.object({
                title: z.string(),
                dueAt: z.number(),
                notes: z.string().optional(),
                relatedResourceType: z.enum(["creditCard", "promoRate", "installmentPlan", "transaction", "none"]).default("none"),
                relatedResourceId: z.string().optional(),
            }),
        }),
        handler: agent.tools.propose.proposeReminderCreate.proposeReminderCreate,
        handlerType: "mutation" as const,
        bucket: "write_single" as const,
        ownership: "W5" as const,
        category: "propose" as const,
        firstTurnGuard: true,
        incrementsReadCount: false,
    },
    propose_reminder_delete: {
        description: "Propose deleting a reminder.",
        llmInputSchema: z.object({
            reminderId: z.string(),
        }),
        handler: agent.tools.propose.proposeReminderDelete.proposeReminderDelete,
        handlerType: "mutation" as const,
        bucket: "write_single" as const,
        ownership: "W5" as const,
        category: "propose" as const,
        firstTurnGuard: true,
        incrementsReadCount: false,
    },

    // ===== EXECUTE / CANCEL / UNDO / INTROSPECT / PLAID (5) =====
    execute_confirmed_proposal: {
        description:
            "Execute a proposal the user has already confirmed. W5 body; user must say 'execute' or 'go ahead'. Destructive confirmation (W5.11) is captured by the trusted `confirm` mutation on the proposal row, never via tool args.",
        llmInputSchema: z.object({
            proposalId: z.string(),
        }),
        handler: agent.tools.execute.executeConfirmedProposal.executeConfirmedProposal,
        handlerType: "mutation" as const,
        bucket: "write_expensive" as const,
        ownership: "W5" as const,
        category: "execute" as const,
        firstTurnGuard: false,
        incrementsReadCount: false,
    },
    cancel_proposal: {
        description: "Cancel a proposal that is awaiting confirmation. Idempotent.",
        llmInputSchema: z.object({
            proposalId: z.string(),
        }),
        handler: agent.tools.execute.cancelProposal.cancelProposal,
        handlerType: "mutation" as const,
        bucket: "write_single" as const,
        ownership: "W2" as const,
        category: "execute" as const,
        firstTurnGuard: false,
        incrementsReadCount: false,
    },
    undo_mutation: {
        description: "Reverse a recently executed proposal within its undo window.",
        llmInputSchema: z.object({
            reversalToken: z.string().describe("Opaque rev_<base32> token."),
        }),
        handler: agent.tools.execute.undoMutation.undoMutation,
        handlerType: "mutation" as const,
        bucket: "write_expensive" as const,
        ownership: "W5" as const,
        category: "execute" as const,
        firstTurnGuard: false,
        incrementsReadCount: false,
    },
    trigger_plaid_resync: {
        description: "Manually trigger a Plaid resync for one or all of the user's linked items.",
        llmInputSchema: z.object({
            plaidItemId: z.string().optional(),
            scope: z.enum(["accounts", "transactions", "liabilities", "all"]).optional(),
        }),
        handler: agent.tools.execute.triggerPlaidResync.triggerPlaidResync,
        handlerType: "mutation" as const,
        bucket: "write_expensive" as const,
        ownership: "W2" as const,
        category: "plaid" as const,
        firstTurnGuard: false,
        incrementsReadCount: false,
    },
    get_proposal: {
        description: "Inspect a proposal's current state (reconciliation M11; W3 subscribes via useQuery).",
        llmInputSchema: z.object({
            proposalId: z.string(),
        }),
        handler: agent.tools.read.getProposal.getProposal,
        handlerType: "query" as const,
        bucket: "read_cheap" as const,
        ownership: "W2" as const,
        category: "introspect" as const,
        firstTurnGuard: false,
        incrementsReadCount: false,
    },
};

export type ToolName = keyof typeof AGENT_TOOLS;

export function isRegisteredToolName(toolName: string): toolName is ToolName {
    return Object.prototype.hasOwnProperty.call(AGENT_TOOLS, toolName);
}

export function isSideEffectfulTool(toolName: string): boolean {
    const def = AGENT_TOOLS[toolName];
    return def?.handlerType === "mutation";
}

export function toolRequiresExplicitConfirmation(toolName: string): boolean {
    const def = AGENT_TOOLS[toolName];
    return def?.category === "execute" || (def?.category === "plaid" && def.handlerType === "mutation");
}
