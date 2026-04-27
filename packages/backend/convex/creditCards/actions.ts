/**
 * Convex Actions for Credit Cards Sync
 *
 * Syncs denormalized credit card data by merging:
 * - plaidAccounts (balances, metadata)
 * - plaidCreditCardLiabilities (APRs, payments)
 *
 * Triggered by:
 * - Initial onboarding (onboardNewConnectionAction Step 4.5)
 * - Webhook events (http.ts - TRANSACTIONS, DEFAULT_UPDATE, LIABILITIES_UPDATE)
 * - Manual refresh (institution detail page)
 */
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";
import { plaidComponentMoneyToCreditCardDollars } from "../money";

/**
 * Sync credit cards (denormalized data)
 *
 * Combines plaidAccounts + plaidCreditCardLiabilities data
 * Computes display fields (company, brand)
 * Handles missing liability data gracefully
 * Uses batch upsert with fallback to individual upserts on error
 *
 * SECURITY: Derives userId from auth context and validates plaidItemId ownership.
 *
 * @param plaidItemId - Convex plaidItem _id
 * @returns Sync stats (synced count, error count)
 */
export const syncCreditCardsAction = action({
    args: {
        plaidItemId: v.string(), // Component returns string IDs
    },
    returns: v.object({
        synced: v.number(),
        errors: v.number(),
    }),
    handler: async (ctx, args): Promise<{ synced: number; errors: number }> => {
        // Step 0: Auth check - derive userId from auth context
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Authentication required");
        }
        const userId = identity.subject; // Clerk user ID

        // Verify plaidItemId belongs to authenticated user
        const plaidItem = await ctx.runQuery(components.plaid.public.getItem, {
            plaidItemId: args.plaidItemId,
        });
        if (!plaidItem || plaidItem.userId !== userId) {
            throw new Error("Unauthorized: Plaid item does not belong to user");
        }

        console.log(`🔄 Syncing credit cards for plaidItem: ${args.plaidItemId}`);

        // Step 1: Get all credit card accounts from the Plaid component
        const accounts = await ctx.runQuery(components.plaid.public.getAccountsByItem, {
            plaidItemId: args.plaidItemId,
        });

        // Filter for credit card accounts
        const creditAccounts = accounts.filter((acc) => acc.type === "credit" && acc.subtype === "credit card");

        if (creditAccounts.length === 0) {
            console.log("ℹ️ No credit cards found for this plaidItem");
            return { synced: 0, errors: 0 };
        }

        console.log(`📋 Found ${creditAccounts.length} credit card accounts`);

        // Step 2: Get liabilities from the Plaid component
        const accountIds = creditAccounts.map((a) => a.accountId);
        const allLiabilities = await ctx.runQuery(components.plaid.public.getLiabilitiesByItem, { plaidItemId: args.plaidItemId });

        // Filter to only liabilities for current accounts (handle orphans)
        const validAccountIdSet = new Set(accountIds);
        const liabilities = allLiabilities.filter((l) => validAccountIdSet.has(l.accountId));

        console.log(`💳 Found ${liabilities.length} liability records`);

        // Step 3: Merge account + liability data
        const creditCardsData = creditAccounts.map((account) => {
            const liability = liabilities.find((l) => l.accountId === account.accountId);

            // Compute display fields - use institution name from plaidItem (e.g., "Chase")
            const company = plaidItem.institutionName || "Unknown";
            const accountLower = account.name.toLowerCase();
            const brand: "visa" | "mastercard" | "amex" | "discover" | "other" = accountLower.includes("apple card")
                ? "mastercard" // Apple Card is always Mastercard
                : accountLower.includes("visa")
                  ? "visa"
                  : accountLower.includes("mastercard")
                    ? "mastercard"
                    : accountLower.includes("amex") || accountLower.includes("american express")
                      ? "amex"
                      : accountLower.includes("discover")
                        ? "discover"
                        : "other"; // Default fallback

            return {
                userId,
                plaidItemId: args.plaidItemId,
                accountId: account.accountId,

                // FROM plaidAccounts - component money is milliunits; native creditCards
                // top-level money remains dollars until an audited backfill migrates it.
                accountName: account.name,
                officialName: account.officialName,
                mask: account.mask || "0000",
                accountType: account.type,
                accountSubtype: account.subtype,
                currentBalance: plaidComponentMoneyToCreditCardDollars(account.balances.current),
                availableCredit: plaidComponentMoneyToCreditCardDollars(account.balances.available),
                creditLimit: plaidComponentMoneyToCreditCardDollars(account.balances.limit),
                isoCurrencyCode: account.balances.isoCurrencyCode,

                // FROM plaidCreditCardLiabilities - top-level liability money is
                // denormalized to dollars; nested APR money stays component milliunits.
                aprs: liability?.aprs ?? [],
                isOverdue: liability?.isOverdue ?? false,
                lastPaymentAmount: plaidComponentMoneyToCreditCardDollars(liability?.lastPaymentAmount),
                lastPaymentDate: liability?.lastPaymentDate,
                lastStatementBalance: plaidComponentMoneyToCreditCardDollars(liability?.lastStatementBalance),
                lastStatementIssueDate: liability?.lastStatementIssueDate,
                minimumPaymentAmount: plaidComponentMoneyToCreditCardDollars(liability?.minimumPaymentAmount),
                nextPaymentDueDate: liability?.nextPaymentDueDate,

                // COMPUTED - Display fields (prefer officialName for actual card product name)
                displayName: account.officialName || account.name,
                company,
                brand,
                lastFour: account.mask || "0000",

                // SYNC TRACKING
                syncStatus: "synced" as const,
                lastSyncError: undefined,
                syncAttempts: 0,
                lastSeenAt: Date.now(),

                // METADATA
                isActive: true, // New cards default to active
            };
        });

        // Step 4: BATCH upsert using internal mutation (auth already verified above)
        try {
            await ctx.runMutation(internal.creditCards.mutations.bulkUpsertCreditCardsInternal, {
                userId,
                creditCards: creditCardsData,
            });

            console.log(`✅ Synced ${creditCardsData.length} credit cards`);
            return { synced: creditCardsData.length, errors: 0 };
        } catch (error) {
            console.error("❌ Failed to bulk upsert credit cards:", error);

            // Fallback: Try individual upserts with error tracking
            let synced = 0;
            let errors = 0;

            for (const card of creditCardsData) {
                try {
                    await ctx.runMutation(internal.creditCards.mutations.upsertCreditCardInternal, {
                        userId,
                        card,
                    });
                    synced++;
                } catch (err) {
                    errors++;
                    console.error(`Failed to sync card ${card.accountId}:`, err);

                    // Store error in database for debugging
                    try {
                        await ctx.runMutation(internal.creditCards.mutations.updateSyncErrorInternal, {
                            userId,
                            accountId: card.accountId,
                            error: err instanceof Error ? err.message : "Unknown error",
                        });
                    } catch (updateError) {
                        console.error("Failed to update sync error:", updateError);
                    }
                }
            }

            console.log(`⚠️ Partial sync: ${synced} synced, ${errors} errors`);
            return { synced, errors };
        }
    },
});

// =============================================================================
// INTERNAL ACTIONS (for webhook/scheduled job use - no auth required)
// =============================================================================

/**
 * Internal: Sync credit cards (denormalized data)
 *
 * Used by webhook-triggered sync actions that don't have auth context.
 * Uses internal mutations that accept userId as parameter.
 *
 * @param userId - Clerk user ID (passed from internal action)
 * @param plaidItemId - Convex plaidItem _id
 * @returns Sync stats (synced count, error count)
 */
export const syncCreditCardsInternal = internalAction({
    args: {
        userId: v.string(),
        plaidItemId: v.string(), // Component returns string IDs
    },
    handler: async (ctx, args): Promise<{ synced: number; errors: number }> => {
        console.log(`🔄 [Internal] Syncing credit cards for plaidItem: ${args.plaidItemId}`);

        // Step 0: Get plaidItem for institutionName
        const plaidItem = await ctx.runQuery(components.plaid.public.getItem, {
            plaidItemId: args.plaidItemId,
        });

        // Step 1: Get all credit card accounts from the Plaid component
        const accounts = await ctx.runQuery(components.plaid.public.getAccountsByItem, {
            plaidItemId: args.plaidItemId,
        });

        // Filter for credit card accounts
        const creditAccounts = accounts.filter((acc) => acc.type === "credit" && acc.subtype === "credit card");

        if (creditAccounts.length === 0) {
            console.log("ℹ️ No credit cards found for this plaidItem");
            return { synced: 0, errors: 0 };
        }

        console.log(`📋 Found ${creditAccounts.length} credit card accounts`);

        // Step 2: Get liabilities from the Plaid component
        const accountIds = creditAccounts.map((a) => a.accountId);
        const allLiabilities = await ctx.runQuery(components.plaid.public.getLiabilitiesByItem, { plaidItemId: args.plaidItemId });

        // Filter to only liabilities for current accounts (handle orphans)
        const validAccountIdSet = new Set(accountIds);
        const liabilities = allLiabilities.filter((l) => validAccountIdSet.has(l.accountId));

        console.log(`💳 Found ${liabilities.length} liability records`);

        // Step 3: Merge account + liability data
        const creditCardsData = creditAccounts.map((account) => {
            const liability = liabilities.find((l) => l.accountId === account.accountId);

            // Compute display fields - use institution name from plaidItem (e.g., "Chase")
            const company = plaidItem?.institutionName || "Unknown";
            const accountLower = account.name.toLowerCase();
            const brand: "visa" | "mastercard" | "amex" | "discover" | "other" = accountLower.includes("apple card")
                ? "mastercard" // Apple Card is always Mastercard
                : accountLower.includes("visa")
                  ? "visa"
                  : accountLower.includes("mastercard")
                    ? "mastercard"
                    : accountLower.includes("amex") || accountLower.includes("american express")
                      ? "amex"
                      : accountLower.includes("discover")
                        ? "discover"
                        : "other"; // Default fallback

            return {
                userId: args.userId,
                plaidItemId: args.plaidItemId,
                accountId: account.accountId,

                // FROM plaidAccounts - component money is milliunits; native creditCards
                // top-level money remains dollars until an audited backfill migrates it.
                accountName: account.name,
                officialName: account.officialName,
                mask: account.mask || "0000",
                accountType: account.type,
                accountSubtype: account.subtype,
                currentBalance: plaidComponentMoneyToCreditCardDollars(account.balances.current),
                availableCredit: plaidComponentMoneyToCreditCardDollars(account.balances.available),
                creditLimit: plaidComponentMoneyToCreditCardDollars(account.balances.limit),
                isoCurrencyCode: account.balances.isoCurrencyCode,

                // FROM plaidCreditCardLiabilities - top-level liability money is
                // denormalized to dollars; nested APR money stays component milliunits.
                aprs: liability?.aprs ?? [],
                isOverdue: liability?.isOverdue ?? false,
                lastPaymentAmount: plaidComponentMoneyToCreditCardDollars(liability?.lastPaymentAmount),
                lastPaymentDate: liability?.lastPaymentDate,
                lastStatementBalance: plaidComponentMoneyToCreditCardDollars(liability?.lastStatementBalance),
                lastStatementIssueDate: liability?.lastStatementIssueDate,
                minimumPaymentAmount: plaidComponentMoneyToCreditCardDollars(liability?.minimumPaymentAmount),
                nextPaymentDueDate: liability?.nextPaymentDueDate,

                // COMPUTED - Display fields (prefer officialName for actual card product name)
                displayName: account.officialName || account.name,
                company,
                brand,
                lastFour: account.mask || "0000",

                // SYNC TRACKING
                syncStatus: "synced" as const,
                lastSyncError: undefined,
                syncAttempts: 0,
                lastSeenAt: Date.now(),

                // METADATA
                isActive: true, // New cards default to active
            };
        });

        // Step 4: BATCH upsert using internal mutation (no auth required)
        try {
            await ctx.runMutation(internal.creditCards.mutations.bulkUpsertCreditCardsInternal, {
                userId: args.userId,
                creditCards: creditCardsData,
            });

            console.log(`✅ Synced ${creditCardsData.length} credit cards`);
            return { synced: creditCardsData.length, errors: 0 };
        } catch (error) {
            console.error("❌ Failed to bulk upsert credit cards:", error);

            // Fallback: Try individual upserts with error tracking
            let synced = 0;
            let errors = 0;

            for (const card of creditCardsData) {
                try {
                    await ctx.runMutation(internal.creditCards.mutations.upsertCreditCardInternal, {
                        userId: args.userId,
                        card,
                    });
                    synced++;
                } catch (err) {
                    errors++;
                    console.error(`Failed to sync card ${card.accountId}:`, err);

                    // Store error in database for debugging
                    try {
                        await ctx.runMutation(internal.creditCards.mutations.updateSyncErrorInternal, {
                            userId: args.userId,
                            accountId: card.accountId,
                            error: err instanceof Error ? err.message : "Unknown error",
                        });
                    } catch (updateError) {
                        console.error("Failed to update sync error:", updateError);
                    }
                }
            }

            console.log(`⚠️ Partial sync: ${synced} synced, ${errors} errors`);
            return { synced, errors };
        }
    },
});
