/**
 * Plaid Component Wrapper
 *
 * Initializes the convex-plaid component and exports wrapper actions.
 * All Plaid operations go through this module.
 *
 * The component handles:
 * - Link token creation and public token exchange
 * - Account, transaction, liability syncing
 * - Webhook verification and processing
 * - Access token encryption
 *
 * App-specific logic (like credit card denormalization) remains in the host app.
 */

import { action, query, mutation, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Plaid } from "@crowdevelopment/convex-plaid";
import { components } from "./_generated/api";
import { api, internal } from "./_generated/api";

// =============================================================================
// PLAID COMPONENT INITIALIZATION (LAZY)
// =============================================================================

/**
 * Lazy-initialized Plaid component instance.
 * Environment variables are only available at runtime, not during code bundling.
 */
let _plaid: Plaid | null = null;

function getPlaid(): Plaid {
  if (!_plaid) {
    // Type assertion needed due to SDK/component type mismatch in v0.5.2
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _plaid = new Plaid(components.plaid as any, {
      PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID!,
      PLAID_SECRET: process.env.PLAID_SECRET!,
      PLAID_ENV: process.env.PLAID_ENV!,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
    });
  }
  return _plaid;
}

// =============================================================================
// LINK FLOW ACTIONS
// =============================================================================

/**
 * Create a link token for Plaid Link UI initialization.
 * IMPORTANT: Always request both "transactions" AND "liabilities" products
 * for credit card apps to get full account + APR/payment data.
 */
export const createLinkTokenAction = action({
  args: {
    userId: v.string(),
    products: v.optional(v.array(v.string())),
  },
  returns: v.object({
    linkToken: v.string(),
  }),
  handler: async (ctx, args) => {
    return await getPlaid().createLinkToken(ctx, {
      userId: args.userId,
      // Default to both products for credit card functionality
      products: args.products ?? ["transactions", "liabilities"],
      webhookUrl: process.env.CONVEX_SITE_URL
        ? `${process.env.CONVEX_SITE_URL}/webhooks-plaid`
        : undefined,
    });
  },
});

/**
 * Exchange public token for access token and create plaidItem.
 */
export const exchangePublicTokenAction = action({
  args: {
    publicToken: v.string(),
    userId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    itemId: v.string(),
    plaidItemId: v.string(),
  }),
  handler: async (ctx, args) => {
    return await getPlaid().exchangePublicToken(ctx, args);
  },
});

// =============================================================================
// SYNC ACTIONS
// =============================================================================

/**
 * Fetch and store account data from Plaid.
 */
export const fetchAccountsAction = action({
  args: {
    plaidItemId: v.string(),
  },
  returns: v.object({
    accountCount: v.number(),
  }),
  handler: async (ctx, args) => {
    return await getPlaid().fetchAccounts(ctx, args);
  },
});

/**
 * Sync transactions using cursor-based pagination.
 */
export const syncTransactionsAction = action({
  args: {
    plaidItemId: v.string(),
    maxPages: v.optional(v.number()),
    maxTransactions: v.optional(v.number()),
  },
  returns: v.object({
    added: v.number(),
    modified: v.number(),
    removed: v.number(),
    cursor: v.string(),
    hasMore: v.boolean(),
    pagesProcessed: v.number(),
    skipped: v.optional(v.boolean()),
    skipReason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    return await getPlaid().syncTransactions(ctx, args);
  },
});

/**
 * Fetch and store liability data (credit cards, mortgages, student loans).
 */
export const fetchLiabilitiesAction = action({
  args: {
    plaidItemId: v.string(),
  },
  returns: v.object({
    creditCards: v.number(),
    mortgages: v.number(),
    studentLoans: v.number(),
  }),
  handler: async (ctx, args) => {
    return await getPlaid().fetchLiabilities(ctx, args);
  },
});

// =============================================================================
// RE-AUTH FLOW
// =============================================================================

/**
 * Create an update link token for re-authentication.
 */
export const createUpdateLinkTokenAction = action({
  args: {
    plaidItemId: v.string(),
  },
  returns: v.object({
    linkToken: v.string(),
  }),
  handler: async (ctx, args) => {
    return await getPlaid().createUpdateLinkToken(ctx, args);
  },
});

/**
 * Complete re-authentication after user has gone through update Link flow.
 */
export const completeReauthAction = action({
  args: {
    plaidItemId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    return await getPlaid().completeReauth(ctx, args);
  },
});

// =============================================================================
// ITEM STATE MUTATIONS
// =============================================================================

/**
 * Toggle the isActive state of a plaidItem.
 * Used to pause/resume syncing for a bank connection.
 */
export const togglePlaidItemActive = mutation({
  args: { itemId: v.string() },
  returns: v.object({ isActive: v.boolean() }),
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      getPlaid().api.togglePlaidItemActive,
      { itemId: args.itemId }
    );
  },
});

/**
 * Explicitly set the isActive state of a plaidItem.
 */
export const setPlaidItemActive = mutation({
  args: {
    itemId: v.string(),
    isActive: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      getPlaid().api.setPlaidItemActive,
      { itemId: args.itemId, isActive: args.isActive }
    );
  },
});

// =============================================================================
// ORCHESTRATOR: FULL ONBOARDING FLOW
// =============================================================================

/**
 * Orchestrate the complete new connection onboarding flow
 *
 * Flow:
 * 1. Exchange public token → Create plaidItem
 * 2. Fetch accounts
 * 3. Sync transactions (initial sync with empty cursor)
 * 4. Fetch liabilities (credit cards, mortgages, student loans)
 * 4.5. Sync Credit Cards (denormalized) - APP SPECIFIC
 */
export const onboardNewConnectionAction = action({
  args: {
    publicToken: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    itemId: string;
    plaidItemId: string;
    accounts: number;
    transactions: number;
    liabilities: {
      creditCards: number;
      mortgages: number;
      studentLoans: number;
    };
  }> => {
    console.log("\n=== PLAID ONBOARDING ORCHESTRATOR ===");
    console.log("User ID:", args.userId);
    console.log("=====================================\n");

    try {
      // Step 1: Exchange token + create plaidItem
      console.log("📍 Step 1/4.5: Exchange token");
      const exchangeResult = await getPlaid().exchangePublicToken(ctx, {
        publicToken: args.publicToken,
        userId: args.userId,
      });

      const { plaidItemId, itemId } = exchangeResult;

      // Step 2: Fetch accounts
      console.log("📍 Step 2/4.5: Fetch accounts");
      const accountsResult = await getPlaid().fetchAccounts(ctx, { plaidItemId });

      // Step 3: Initial transaction sync
      console.log("📍 Step 3/4.5: Initial transaction sync");
      const syncResult = await getPlaid().syncTransactions(ctx, { plaidItemId });

      // Step 4: Fetch liabilities
      console.log("📍 Step 4/4.5: Fetch liabilities");
      const liabilitiesResult = await getPlaid().fetchLiabilities(ctx, { plaidItemId });

      // Step 4.5: Sync Credit Cards (Denormalized) - APP SPECIFIC
      // Note: syncCreditCardsAction derives userId from auth context
      console.log("📍 Step 4.5/4.5: Sync Credit Cards (Denormalized)");
      const creditCardSyncResult = await ctx.runAction(
        api.creditCards.actions.syncCreditCardsAction,
        { plaidItemId }
      );
      console.log(
        `✅ Synced ${creditCardSyncResult.synced} credit cards${creditCardSyncResult.errors > 0 ? ` (${creditCardSyncResult.errors} errors)` : ""}`
      );

      console.log("\n=== ONBOARDING COMPLETE ===");
      console.log("Item ID:", itemId);
      console.log("Accounts:", accountsResult.accountCount);
      console.log("Transactions:", syncResult.added);
      console.log(
        "Liabilities:",
        liabilitiesResult.creditCards +
          liabilitiesResult.mortgages +
          liabilitiesResult.studentLoans
      );
      console.log("===========================\n");

      return {
        success: true,
        itemId,
        plaidItemId,
        accounts: accountsResult.accountCount,
        transactions: syncResult.added,
        liabilities: {
          creditCards: liabilitiesResult.creditCards,
          mortgages: liabilitiesResult.mortgages,
          studentLoans: liabilitiesResult.studentLoans,
        },
      };
    } catch (error) {
      console.error("\n❌ ONBOARDING FAILED ===");
      console.error(error);
      console.error("=========================\n");
      throw error;
    }
  },
});

// =============================================================================
// INTERNAL ACTIONS (for webhooks and crons)
// =============================================================================

/**
 * Internal action for webhook-triggered transaction sync.
 */
export const syncTransactionsInternal = internalAction({
  args: {
    plaidItemId: v.string(),
    trigger: v.optional(v.union(v.literal("webhook"), v.literal("scheduled"), v.literal("manual"))),
  },
  handler: async (ctx, args) => {
    console.log(`[syncTransactionsInternal] Syncing item ${args.plaidItemId} (trigger: ${args.trigger ?? "unknown"})`);
    return await getPlaid().syncTransactions(ctx, {
      plaidItemId: args.plaidItemId,
    });
  },
});

/**
 * Internal action for webhook-triggered liabilities sync.
 */
export const fetchLiabilitiesInternal = internalAction({
  args: {
    plaidItemId: v.string(),
    trigger: v.optional(v.union(v.literal("webhook"), v.literal("scheduled"), v.literal("manual"))),
  },
  handler: async (ctx, args) => {
    console.log(`[fetchLiabilitiesInternal] Fetching liabilities for ${args.plaidItemId} (trigger: ${args.trigger ?? "unknown"})`);
    return await getPlaid().fetchLiabilities(ctx, {
      plaidItemId: args.plaidItemId,
    });
  },
});

/**
 * Internal action for webhook/cron-triggered account balance sync.
 * This fetches fresh account balance data from Plaid.
 */
export const fetchAccountsInternal = internalAction({
  args: {
    plaidItemId: v.string(),
    trigger: v.optional(v.union(v.literal("webhook"), v.literal("scheduled"), v.literal("manual"))),
  },
  handler: async (ctx, args) => {
    console.log(`[fetchAccountsInternal] Fetching accounts for ${args.plaidItemId} (trigger: ${args.trigger ?? "unknown"})`);
    return await getPlaid().fetchAccounts(ctx, {
      plaidItemId: args.plaidItemId,
    });
  },
});

/**
 * Internal action that chains account refresh and credit card sync sequentially.
 * This guarantees ordering - credit card sync only runs AFTER account refresh completes.
 *
 * Use this instead of separate scheduled calls with fixed delays to avoid race conditions.
 */
export const refreshAccountsAndSyncCreditCardsInternal = internalAction({
  args: {
    plaidItemId: v.string(),
    userId: v.string(),
    trigger: v.optional(v.union(v.literal("webhook"), v.literal("scheduled"), v.literal("manual"))),
  },
  handler: async (ctx, args) => {
    const triggerLabel = args.trigger ?? "unknown";

    // Step 1: Fetch fresh account balances
    try {
      console.log(`[refreshAndSync] Step 1: Fetching accounts for ${args.plaidItemId} (trigger: ${triggerLabel})`);
      await getPlaid().fetchAccounts(ctx, {
        plaidItemId: args.plaidItemId,
      });
      console.log(`[refreshAndSync] ✅ Accounts refreshed`);
    } catch (e) {
      console.error(`[refreshAndSync] ❌ Account refresh failed:`, e);
      // Continue to credit card sync anyway - it will use whatever data is available
    }

    // Step 2: Sync credit cards (runs only after step 1 completes)
    try {
      console.log(`[refreshAndSync] Step 2: Syncing credit cards for user ${args.userId}`);
      await ctx.runAction(internal.creditCards.actions.syncCreditCardsInternal, {
        userId: args.userId,
        plaidItemId: args.plaidItemId,
      });
      console.log(`[refreshAndSync] ✅ Credit cards synced`);
    } catch (e) {
      console.error(`[refreshAndSync] ❌ Credit card sync failed:`, e);
    }
  },
});

// =============================================================================
// RECURRING STREAMS ACTIONS
// =============================================================================

/**
 * Fetch recurring streams (public action for manual refresh).
 */
export const fetchRecurringStreamsAction = action({
  args: {
    plaidItemId: v.string(),
    trigger: v.optional(v.string()),
  },
  returns: v.object({
    inflows: v.number(),
    outflows: v.number(),
  }),
  handler: async (ctx, args) => {
    console.log(`🔄 Fetching recurring streams for ${args.plaidItemId} (${args.trigger ?? "manual"})`);
    const result = await getPlaid().fetchRecurringStreams(ctx, {
      plaidItemId: args.plaidItemId,
    });
    console.log(`✅ Fetched ${result.inflows} inflow, ${result.outflows} outflow streams`);
    return result;
  },
});

/**
 * Internal action for webhook/cron-triggered recurring streams sync.
 */
export const fetchRecurringStreamsInternal = internalAction({
  args: {
    plaidItemId: v.string(),
    trigger: v.optional(v.union(v.literal("webhook"), v.literal("scheduled"), v.literal("manual"))),
  },
  handler: async (ctx, args) => {
    console.log(`🔄 [Internal] Fetching recurring streams for ${args.plaidItemId} (${args.trigger ?? "internal"})`);
    const result = await getPlaid().fetchRecurringStreams(ctx, {
      plaidItemId: args.plaidItemId,
    });
    console.log(`✅ Fetched ${result.inflows} inflow, ${result.outflows} outflow streams`);
    return result;
  },
});

// =============================================================================
// DAILY SYNC ORCHESTRATOR (Fan-out pattern for scalability)
// =============================================================================

/**
 * Internal action for syncing a single Plaid item.
 * Sequentially runs: transactions → liabilities → recurring → credit cards
 * Each step is wrapped in try/catch to continue on failure.
 *
 * This is called by syncAllActiveItemsInternal via scheduler for fan-out.
 */
export const syncPlaidItemInternal = internalAction({
  args: {
    plaidItemId: v.string(),
    userId: v.string(),
    products: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const hasLiabilities = args.products?.includes("liabilities");
    const hasTransactions = args.products?.includes("transactions");
    let liabilitiesSucceeded = false;

    console.log(`📍 Syncing item ${args.plaidItemId} (products: ${args.products?.join(", ") ?? "none"})`);

    // Step 0: Fetch fresh account balances (always run first)
    try {
      await ctx.runAction(internal.plaidComponent.fetchAccountsInternal, {
        plaidItemId: args.plaidItemId,
        trigger: "scheduled",
      });
      console.log(`  ✅ Accounts synced`);
    } catch (e) {
      console.error(`  ❌ Accounts failed:`, e);
    }

    // Step 1: Transactions
    if (hasTransactions) {
      try {
        await ctx.runAction(internal.plaidComponent.syncTransactionsInternal, {
          plaidItemId: args.plaidItemId,
          trigger: "scheduled",
        });
        console.log(`  ✅ Transactions synced`);
      } catch (e) {
        console.error(`  ❌ Transactions failed:`, e);
      }
    }

    // Step 2: Liabilities
    if (hasLiabilities) {
      try {
        await ctx.runAction(internal.plaidComponent.fetchLiabilitiesInternal, {
          plaidItemId: args.plaidItemId,
          trigger: "scheduled",
        });
        liabilitiesSucceeded = true;
        console.log(`  ✅ Liabilities synced`);
      } catch (e) {
        console.error(`  ❌ Liabilities failed:`, e);
      }
    }

    // Step 3: Recurring Streams
    if (hasTransactions) {
      try {
        await ctx.runAction(internal.plaidComponent.fetchRecurringStreamsInternal, {
          plaidItemId: args.plaidItemId,
          trigger: "scheduled",
        });
        console.log(`  ✅ Recurring streams synced`);
      } catch (e) {
        console.error(`  ❌ Recurring streams failed:`, e);
      }
    }

    // Step 4: Credit Cards denormalization (only if liabilities succeeded)
    if (liabilitiesSucceeded) {
      try {
        await ctx.runAction(internal.creditCards.actions.syncCreditCardsInternal, {
          userId: args.userId,
          plaidItemId: args.plaidItemId,
        });
        console.log(`  ✅ Credit cards synced`);
      } catch (e) {
        console.error(`  ❌ Credit cards failed:`, e);
      }
    }

    console.log(`✅ Item ${args.plaidItemId} sync complete`);
  },
});

/**
 * Internal action for daily cron - fans out to per-item sync actions.
 *
 * Uses scheduler.runAfter(0, ...) to run each item sync as a separate action,
 * avoiding action time limits as the number of items grows.
 */
export const syncAllActiveItemsInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all active items
    const items = await ctx.runQuery(components.plaid.public.getAllActiveItems, {});

    console.log(`🔄 Daily sync: scheduling ${items.length} item syncs`);

    // Fan-out: schedule each item sync as a separate action
    for (const item of items) {
      await ctx.scheduler.runAfter(0, internal.plaidComponent.syncPlaidItemInternal, {
        plaidItemId: item._id,
        userId: item.userId,
        products: item.products,
      });
    }

    console.log(`✅ Scheduled ${items.length} item syncs`);
  },
});

// =============================================================================
// INTERNAL MUTATIONS (for webhooks and internal functions)
// =============================================================================

/**
 * Mark a plaidItem as needing re-authentication (internal)
 */
export const markNeedsReauthInternal = internalMutation({
  args: {
    itemId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[markNeedsReauth] Item ${args.itemId}: ${args.reason}`);

    try {
      await ctx.runMutation(
        components.plaid.public.setPlaidItemActive,
        { itemId: args.itemId, isActive: false }
      );
    } catch (error) {
      console.error(`[markNeedsReauth] Failed to update item ${args.itemId}:`, error);
    }

    return { success: true };
  },
});

/**
 * Set an error on a plaidItem (internal)
 */
export const setItemErrorInternal = internalMutation({
  args: {
    itemId: v.string(),
    errorCode: v.string(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[setItemError] Item ${args.itemId}: ${args.errorCode} - ${args.errorMessage}`);

    try {
      await ctx.runMutation(
        components.plaid.public.setPlaidItemActive,
        { itemId: args.itemId, isActive: false }
      );
    } catch (error) {
      console.error(`[setItemError] Failed to update item ${args.itemId}:`, error);
    }

    return { success: true };
  },
});

/**
 * Deactivate a plaidItem (internal)
 */
export const deactivateItemInternal = internalMutation({
  args: {
    itemId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[deactivateItem] Item ${args.itemId}: ${args.reason}`);

    try {
      await ctx.runMutation(
        components.plaid.public.setPlaidItemActive,
        { itemId: args.itemId, isActive: false }
      );
    } catch (error) {
      console.error(`[deactivateItem] Failed to update item ${args.itemId}:`, error);
    }

    return { success: true };
  },
});

// =============================================================================
// QUERY WRAPPERS (Expose component queries to frontend)
// =============================================================================

/**
 * Get accounts for a specific plaidItem.
 */
export const getAccountsByPlaidItemId = query({
  args: { plaidItemId: v.string() },
  returns: v.array(
    v.object({
      _id: v.string(),
      userId: v.string(),
      plaidItemId: v.string(),
      accountId: v.string(),
      name: v.string(),
      officialName: v.optional(v.string()),
      mask: v.optional(v.string()),
      type: v.string(),
      subtype: v.optional(v.string()),
      balances: v.object({
        available: v.optional(v.number()),
        current: v.optional(v.number()),
        limit: v.optional(v.number()),
        isoCurrencyCode: v.string(),
      }),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      components.plaid.public.getAccountsByItem,
      { plaidItemId: args.plaidItemId }
    );
  },
});

/**
 * Get accounts for a user.
 */
export const getAccountsByUserId = query({
  args: { userId: v.string() },
  returns: v.array(
    v.object({
      _id: v.string(),
      userId: v.string(),
      plaidItemId: v.string(),
      accountId: v.string(),
      name: v.string(),
      officialName: v.optional(v.string()),
      mask: v.optional(v.string()),
      type: v.string(),
      subtype: v.optional(v.string()),
      balances: v.object({
        available: v.optional(v.number()),
        current: v.optional(v.number()),
        limit: v.optional(v.number()),
        isoCurrencyCode: v.string(),
      }),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      components.plaid.public.getAccountsByUser,
      { userId: args.userId }
    );
  },
});

/**
 * Get credit card liabilities for a user.
 */
export const getLiabilitiesByUserId = query({
  args: { userId: v.string() },
  returns: v.array(
    v.object({
      _id: v.string(),
      userId: v.string(),
      plaidItemId: v.string(),
      accountId: v.string(),
      aprs: v.array(
        v.object({
          aprPercentage: v.number(),
          aprType: v.string(),
          balanceSubjectToApr: v.optional(v.number()),
          interestChargeAmount: v.optional(v.number()),
        })
      ),
      isOverdue: v.boolean(),
      lastPaymentAmount: v.optional(v.number()),
      lastPaymentDate: v.optional(v.string()),
      lastStatementBalance: v.optional(v.number()),
      lastStatementIssueDate: v.optional(v.string()),
      minimumPaymentAmount: v.optional(v.number()),
      nextPaymentDueDate: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      components.plaid.public.getLiabilitiesByUser,
      { userId: args.userId }
    );
  },
});

// =============================================================================
// CONFIG EXPORTS
// =============================================================================

/**
 * Get Plaid config for webhook registration.
 */
export function getPlaidConfig() {
  return {
    PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID!,
    PLAID_SECRET: process.env.PLAID_SECRET!,
    PLAID_ENV: process.env.PLAID_ENV!,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
  };
}

/**
 * Export the component and getter for direct access if needed.
 */
export { getPlaid, components };
