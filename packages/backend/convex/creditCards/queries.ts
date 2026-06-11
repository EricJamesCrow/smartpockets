/**
 * Credit Card Queries
 *
 * All read operations for credit card data.
 * Uses Convex Ents for type-safe queries with user ownership verification.
 *
 * SECURITY: Filters out cards from paused Plaid items (SmartPockets parity).
 */
import { v } from "convex/values";
import { query } from "../functions";
import { getCardStatsForUser, getOwnedCard, listOwnedCards } from "./shared";

/**
 * List all credit cards for the current user
 *
 * @param includeInactive - Whether to include inactive cards (default: false)
 * @returns Array of credit cards owned by the viewer
 */
export const list = query({
    args: {
        includeInactive: v.optional(v.boolean()),
    },
    returns: v.array(
        v.object({
            _id: v.id("creditCards"),
            _creationTime: v.number(),
            userId: v.id("users"),

            // Plaid identifiers
            plaidItemId: v.optional(v.string()),
            accountId: v.string(),

            // Account metadata
            accountName: v.string(),
            officialName: v.optional(v.string()),
            mask: v.optional(v.string()),
            accountType: v.optional(v.string()),
            accountSubtype: v.optional(v.string()),

            // Balances
            currentBalance: v.optional(v.number()),
            availableCredit: v.optional(v.number()),
            creditLimit: v.optional(v.number()),
            isoCurrencyCode: v.optional(v.string()),

            // APR information
            aprs: v.optional(
                v.array(
                    v.object({
                        aprPercentage: v.number(),
                        aprType: v.string(),
                        balanceSubjectToApr: v.optional(v.number()),
                        interestChargeAmount: v.optional(v.number()),
                    }),
                ),
            ),

            // Payment status
            isOverdue: v.boolean(),
            lastPaymentAmount: v.optional(v.number()),
            lastPaymentDate: v.optional(v.string()),
            lastStatementBalance: v.optional(v.number()),
            lastStatementIssueDate: v.optional(v.string()),
            minimumPaymentAmount: v.optional(v.number()),
            nextPaymentDueDate: v.optional(v.string()),

            // Display fields
            displayName: v.string(),
            company: v.optional(v.string()),
            brand: v.optional(v.union(v.literal("visa"), v.literal("mastercard"), v.literal("amex"), v.literal("discover"), v.literal("other"))),
            lastFour: v.optional(v.string()),

            // Sync tracking
            syncStatus: v.optional(v.union(v.literal("synced"), v.literal("syncing"), v.literal("error"), v.literal("stale"))),
            lastSyncError: v.optional(v.string()),
            syncAttempts: v.optional(v.number()),
            lastSyncedAt: v.optional(v.number()),
            lastSeenAt: v.optional(v.number()),

            // User preferences
            isLocked: v.boolean(),
            lockedAt: v.optional(v.number()),
            isAutoPay: v.optional(v.boolean()), // Optional for backwards compatibility with existing records
            autoPayEnabledAt: v.optional(v.number()),

            // User overrides
            userOverrides: v.optional(
                v.object({
                    officialName: v.optional(v.string()),
                    accountName: v.optional(v.string()),
                    company: v.optional(v.string()),
                    aprs: v.optional(
                        v.array(
                            v.object({
                                index: v.number(),
                                aprPercentage: v.optional(v.number()),
                                balanceSubjectToApr: v.optional(v.number()),
                                interestChargeAmount: v.optional(v.number()),
                            }),
                        ),
                    ),
                    providerDashboardUrl: v.optional(v.string()),
                }),
            ),

            // State
            isActive: v.boolean(),
        }),
    ),
    async handler(ctx, { includeInactive = false }) {
        // Shared with the MCP bridge (mcp/bridge.ts) — logic lives in shared.ts.
        return listOwnedCards(ctx, ctx.viewerX(), includeInactive);
    },
});

/**
 * Get a single credit card by ID
 *
 * Verifies the card belongs to the current user.
 *
 * @param cardId - The credit card document ID
 * @returns Credit card or null if not found/not owned
 */
export const get = query({
    args: {
        cardId: v.id("creditCards"),
    },
    returns: v.union(
        v.object({
            _id: v.id("creditCards"),
            _creationTime: v.number(),
            userId: v.id("users"),

            // Plaid identifiers
            plaidItemId: v.optional(v.string()),
            accountId: v.string(),

            // Account metadata
            accountName: v.string(),
            officialName: v.optional(v.string()),
            mask: v.optional(v.string()),
            accountType: v.optional(v.string()),
            accountSubtype: v.optional(v.string()),

            // Balances
            currentBalance: v.optional(v.number()),
            availableCredit: v.optional(v.number()),
            creditLimit: v.optional(v.number()),
            isoCurrencyCode: v.optional(v.string()),

            // APR information
            aprs: v.optional(
                v.array(
                    v.object({
                        aprPercentage: v.number(),
                        aprType: v.string(),
                        balanceSubjectToApr: v.optional(v.number()),
                        interestChargeAmount: v.optional(v.number()),
                    }),
                ),
            ),

            // Payment status
            isOverdue: v.boolean(),
            lastPaymentAmount: v.optional(v.number()),
            lastPaymentDate: v.optional(v.string()),
            lastStatementBalance: v.optional(v.number()),
            lastStatementIssueDate: v.optional(v.string()),
            minimumPaymentAmount: v.optional(v.number()),
            nextPaymentDueDate: v.optional(v.string()),

            // Display fields
            displayName: v.string(),
            company: v.optional(v.string()),
            brand: v.optional(v.union(v.literal("visa"), v.literal("mastercard"), v.literal("amex"), v.literal("discover"), v.literal("other"))),
            lastFour: v.optional(v.string()),

            // Sync tracking
            syncStatus: v.optional(v.union(v.literal("synced"), v.literal("syncing"), v.literal("error"), v.literal("stale"))),
            lastSyncError: v.optional(v.string()),
            syncAttempts: v.optional(v.number()),
            lastSyncedAt: v.optional(v.number()),
            lastSeenAt: v.optional(v.number()),

            // User preferences
            isLocked: v.boolean(),
            lockedAt: v.optional(v.number()),
            isAutoPay: v.optional(v.boolean()), // Optional for backwards compatibility with existing records
            autoPayEnabledAt: v.optional(v.number()),

            // User overrides
            userOverrides: v.optional(
                v.object({
                    officialName: v.optional(v.string()),
                    accountName: v.optional(v.string()),
                    company: v.optional(v.string()),
                    aprs: v.optional(
                        v.array(
                            v.object({
                                index: v.number(),
                                aprPercentage: v.optional(v.number()),
                                balanceSubjectToApr: v.optional(v.number()),
                                interestChargeAmount: v.optional(v.number()),
                            }),
                        ),
                    ),
                    providerDashboardUrl: v.optional(v.string()),
                }),
            ),

            // State
            isActive: v.boolean(),
        }),
        v.null(),
    ),
    async handler(ctx, { cardId }) {
        // Shared with the MCP bridge (mcp/bridge.ts) — logic lives in shared.ts.
        return getOwnedCard(ctx, ctx.viewerX(), cardId);
    },
});

/**
 * Get aggregated stats for user's credit cards
 *
 * @returns Summary statistics across all active cards
 */
export const getStats = query({
    args: {},
    returns: v.object({
        totalBalance: v.number(),
        totalAvailableCredit: v.number(),
        totalCreditLimit: v.number(),
        overdueCount: v.number(),
        lockedCount: v.number(),
        averageUtilization: v.number(),
        cardCount: v.number(),
    }),
    async handler(ctx) {
        // Shared with the MCP bridge (mcp/bridge.ts) — logic lives in shared.ts.
        return getCardStatsForUser(ctx, ctx.viewerX());
    },
});
