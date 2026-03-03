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
import { components } from "../_generated/api";

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
          })
        )
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
      brand: v.optional(
        v.union(
          v.literal("visa"),
          v.literal("mastercard"),
          v.literal("amex"),
          v.literal("discover"),
          v.literal("other")
        )
      ),
      lastFour: v.optional(v.string()),

      // Sync tracking
      syncStatus: v.optional(
        v.union(
          v.literal("synced"),
          v.literal("syncing"),
          v.literal("error"),
          v.literal("stale")
        )
      ),
      lastSyncError: v.optional(v.string()),
      syncAttempts: v.optional(v.number()),
      lastSyncedAt: v.optional(v.number()),
      lastSeenAt: v.optional(v.number()),

      // User preferences
      isLocked: v.boolean(),
      lockedAt: v.optional(v.number()),
      isAutoPay: v.optional(v.boolean()), // Optional for backwards compatibility with existing records
      autoPayEnabledAt: v.optional(v.number()),

      // Statement & issuer config
      statementClosingDay: v.optional(v.number()),
      payOverTimeEnabled: v.optional(v.boolean()),
      payOverTimeLimit: v.optional(v.number()),
      payOverTimeApr: v.optional(v.number()),

      // State
      isActive: v.boolean(),
    })
  ),
  async handler(ctx, { includeInactive = false }) {
    const viewer = ctx.viewerX();

    // Get user's active Plaid items to filter by (SmartPockets parity)
    const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: viewer.externalId,
    });
    const activeItemIds = new Set(
      userItems.filter((item) => item.isActive !== false).map((item) => item._id)
    );

    // Helper to filter cards by active Plaid items
    // Cards without plaidItemId (manual) are always included
    const filterByActivePlaidItem = (card: { plaidItemId?: string }) =>
      !card.plaidItemId || activeItemIds.has(card.plaidItemId);

    if (includeInactive) {
      // Get all cards for user (use by_user_active index with just userId prefix)
      const cards = await ctx
        .table("creditCards", "by_user_active", (q) => q.eq("userId", viewer._id))
        .map((card) => card.doc());
      return cards.filter(filterByActivePlaidItem);
    }

    // Get only active cards, filtered by active Plaid items
    const cards = await ctx
      .table("creditCards", "by_user_active", (q) =>
        q.eq("userId", viewer._id).eq("isActive", true)
      )
      .map((card) => card.doc());
    return cards.filter(filterByActivePlaidItem);
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
          })
        )
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
      brand: v.optional(
        v.union(
          v.literal("visa"),
          v.literal("mastercard"),
          v.literal("amex"),
          v.literal("discover"),
          v.literal("other")
        )
      ),
      lastFour: v.optional(v.string()),

      // Sync tracking
      syncStatus: v.optional(
        v.union(
          v.literal("synced"),
          v.literal("syncing"),
          v.literal("error"),
          v.literal("stale")
        )
      ),
      lastSyncError: v.optional(v.string()),
      syncAttempts: v.optional(v.number()),
      lastSyncedAt: v.optional(v.number()),
      lastSeenAt: v.optional(v.number()),

      // User preferences
      isLocked: v.boolean(),
      lockedAt: v.optional(v.number()),
      isAutoPay: v.optional(v.boolean()), // Optional for backwards compatibility with existing records
      autoPayEnabledAt: v.optional(v.number()),

      // Statement & issuer config
      statementClosingDay: v.optional(v.number()),
      payOverTimeEnabled: v.optional(v.boolean()),
      payOverTimeLimit: v.optional(v.number()),
      payOverTimeApr: v.optional(v.number()),

      // State
      isActive: v.boolean(),
    }),
    v.null()
  ),
  async handler(ctx, { cardId }) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").get(cardId);

    // Verify ownership
    if (!card || card.userId !== viewer._id) {
      return null;
    }

    // If card is from a Plaid item, verify item is active
    if (card.plaidItemId) {
      const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
        userId: viewer.externalId,
      });
      const activeItemIds = new Set(
        userItems.filter((item) => item.isActive !== false).map((item) => item._id)
      );
      if (!activeItemIds.has(card.plaidItemId)) {
        return null; // Card's Plaid item is paused
      }
    }

    return card.doc();
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
    const viewer = ctx.viewerX();

    // Get user's active Plaid items to filter by (SmartPockets parity)
    const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: viewer.externalId,
    });
    const activeItemIds = new Set(
      userItems.filter((item) => item.isActive !== false).map((item) => item._id)
    );

    const allCards = await ctx
      .table("creditCards", "by_user_active", (q) =>
        q.eq("userId", viewer._id).eq("isActive", true)
      )
      .map((card) => card.doc());

    // Filter cards by active Plaid items (manual cards always included)
    const cards = allCards.filter(
      (card) => !card.plaidItemId || activeItemIds.has(card.plaidItemId)
    );

    const stats = {
      totalBalance: 0,
      totalAvailableCredit: 0,
      totalCreditLimit: 0,
      overdueCount: 0,
      lockedCount: 0,
      cardCount: cards.length,
    };

    for (const card of cards) {
      stats.totalBalance += card.currentBalance ?? 0;
      stats.totalAvailableCredit += card.availableCredit ?? 0;
      stats.totalCreditLimit += card.creditLimit ?? 0;
      if (card.isOverdue) stats.overdueCount++;
      if (card.isLocked) stats.lockedCount++;
    }

    // Calculate average utilization
    const averageUtilization =
      stats.totalCreditLimit > 0
        ? (stats.totalBalance / stats.totalCreditLimit) * 100
        : 0;

    return {
      ...stats,
      averageUtilization: Math.round(averageUtilization * 100) / 100,
    };
  },
});

/**
 * Compute the Interest Saving Balance for a credit card
 *
 * The ISB is the minimum payment needed to avoid interest on next month's
 * regular purchases while keeping promo and installment balances intact.
 *
 * Formula: currentBalance - totalProtectedBalances + totalProtectedPayments
 *
 * "Protected" balances are promo rates and installment plans that should
 * not be paid off early (they carry 0% or deferred interest).
 *
 * @param creditCardId - Credit card document ID
 * @returns ISB amount and breakdown components
 */
export const computeInterestSavingBalance = query({
  args: {
    creditCardId: v.id("creditCards"),
  },
  returns: v.object({
    interestSavingBalance: v.number(),
    currentBalance: v.number(),
    totalProtectedBalances: v.number(),
    totalProtectedPayments: v.number(),
    hasPromos: v.boolean(),
  }),
  async handler(ctx, { creditCardId }) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(creditCardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }

    const currentBalance = card.currentBalance ?? 0;

    // Sum all active promo balances and their minimum payments
    const promos = await ctx
      .table("promoRates", "by_card", (q) => q.eq("creditCardId", creditCardId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .map((promo) => promo.doc());

    // Sum all active installment balances and their payments
    const installments = await ctx
      .table("installmentPlans", "by_card", (q) => q.eq("creditCardId", creditCardId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .map((plan) => plan.doc());

    const totalPromoBalances = promos.reduce(
      (sum, p) => sum + p.remainingBalance,
      0,
    );
    const totalPromoMinPayments = promos.reduce(
      (sum, p) => sum + (p.monthlyMinimumPayment ?? 0),
      0,
    );
    const totalInstallmentBalances = installments.reduce(
      (sum, p) => sum + p.remainingPrincipal,
      0,
    );
    const totalInstallmentPayments = installments.reduce(
      (sum, p) => sum + p.monthlyPrincipal + p.monthlyFee,
      0,
    );

    const totalProtectedBalances = totalPromoBalances + totalInstallmentBalances;
    const totalProtectedPayments =
      totalPromoMinPayments + totalInstallmentPayments;

    const interestSavingBalance =
      currentBalance - totalProtectedBalances + totalProtectedPayments;

    return {
      interestSavingBalance: Math.max(0, interestSavingBalance),
      currentBalance,
      totalProtectedBalances,
      totalProtectedPayments,
      hasPromos: promos.length > 0 || installments.length > 0,
    };
  },
});

/**
 * Compute year-to-date fees and interest for a credit card
 *
 * Scans the Plaid component's transaction data for the card's account,
 * filtering to the current year and summing BANK_FEES and INTEREST categories.
 *
 * Note: Plaid component stores amounts in MILLIUNITS (amount * 1000).
 * We convert to dollars before returning.
 *
 * @param creditCardId - Credit card document ID
 * @returns YTD fee total, interest total, and the year
 */
export const computeYtdFeesInterest = query({
  args: {
    creditCardId: v.id("creditCards"),
  },
  returns: v.object({
    totalFees: v.number(),
    totalInterest: v.number(),
    year: v.number(),
  }),
  async handler(ctx, { creditCardId }) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(creditCardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Unauthorized");
    }

    const now = new Date();
    const year = now.getFullYear();
    const yearStart = `${year}-01-01`;

    // Fetch transactions from the Plaid component by accountId
    const transactions = await ctx.runQuery(
      components.plaid.public.getTransactionsByAccount,
      { accountId: card.accountId },
    );

    // Filter to current year and sum fees/interest
    let totalFeesMilliunits = 0;
    let totalInterestMilliunits = 0;

    for (const tx of transactions) {
      // Skip transactions before the current year
      if (tx.date < yearStart) continue;

      if (tx.categoryPrimary === "BANK_FEES") {
        totalFeesMilliunits += tx.amount;
      } else if (tx.categoryPrimary === "INTEREST") {
        totalInterestMilliunits += tx.amount;
      }
    }

    // Convert from milliunits to dollars
    return {
      totalFees: totalFeesMilliunits / 1000,
      totalInterest: totalInterestMilliunits / 1000,
      year,
    };
  },
});
