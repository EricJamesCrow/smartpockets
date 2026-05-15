/**
 * Card Queries for Wallet Filtering
 *
 * Query functions for listing credit cards filtered by wallet membership.
 * Used by CreditCardsContent when navigating from a specific wallet.
 */

import { v } from "convex/values";
import { query } from "../functions";
import { components } from "../_generated/api";

// Credit card return validator - matches creditCards/queries.ts list return type
const creditCardValidator = v.object({
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
  isAutoPay: v.optional(v.boolean()),
  autoPayEnabledAt: v.optional(v.number()),

  // Statement & issuer config
  statementClosingDay: v.optional(v.number()),
  payOverTimeEnabled: v.optional(v.boolean()),
  payOverTimeLimit: v.optional(v.number()),
  payOverTimeApr: v.optional(v.number()),

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
          })
        )
      ),
      providerDashboardUrl: v.optional(v.string()),
    })
  ),

  // State
  isActive: v.boolean(),
});

/**
 * List cards in a specific wallet
 *
 * Returns cards sorted by their sortOrder within the wallet.
 * Filters out cards from paused Plaid items (SmartPockets parity).
 *
 * @param walletId - The wallet document ID
 * @returns Array of credit cards in the wallet, sorted by sortOrder
 */
export const listByWallet = query({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.array(creditCardValidator),
  async handler(ctx, { walletId }) {
    const viewer = ctx.viewerX();

    // Verify wallet ownership
    const wallet = await ctx.table("wallets").get(walletId);
    if (!wallet || wallet.userId !== viewer._id) {
      return [];
    }

    // Get user's active Plaid items for filtering (SmartPockets parity)
    const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: viewer.externalId,
    });
    const activeItemIds = new Set(
      userItems.filter((item) => item.isActive !== false).map((item) => item._id)
    );

    // Get walletCards sorted by sortOrder
    const walletCards = await ctx.table(
      "walletCards",
      "by_wallet_sortOrder",
      (q) => q.eq("walletId", walletId)
    );

    // Fetch each credit card and filter by ownership + active Plaid items
    const cards = await Promise.all(
      walletCards.map(async (wc) => {
        const card = await wc.edge("creditCard");
        return card;
      })
    );

    // Filter out any null cards, verify ownership, and filter by active Plaid items
    return cards
      .filter(
        (card): card is NonNullable<typeof card> =>
          card !== null &&
          card.userId === viewer._id &&
          card.isActive &&
          (!card.plaidItemId || activeItemIds.has(card.plaidItemId))
      )
      .map((card) => card.doc());
  },
});

/**
 * List cards NOT in a specific wallet
 *
 * Used by AddCardsSlideout to show available cards to add.
 * Filters out cards from paused Plaid items (SmartPockets parity).
 *
 * @param walletId - The wallet document ID
 * @returns Array of active credit cards not in the wallet
 */
export const listNotInWallet = query({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.array(creditCardValidator),
  async handler(ctx, { walletId }) {
    const viewer = ctx.viewerX();

    // Verify wallet ownership
    const wallet = await ctx.table("wallets").get(walletId);
    if (!wallet || wallet.userId !== viewer._id) {
      return [];
    }

    // Get user's active Plaid items for filtering (SmartPockets parity)
    const userItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: viewer.externalId,
    });
    const activeItemIds = new Set(
      userItems.filter((item) => item.isActive !== false).map((item) => item._id)
    );

    // Get all user's active cards
    const allCards = await ctx
      .table("creditCards", "by_user_active", (q) =>
        q.eq("userId", viewer._id).eq("isActive", true)
      )
      .map((card) => card.doc());

    // Filter by active Plaid items
    const activeCards = allCards.filter(
      (card) => !card.plaidItemId || activeItemIds.has(card.plaidItemId)
    );

    // Get cards already in wallet
    const walletCards = await ctx.table(
      "walletCards",
      "by_wallet_sortOrder",
      (q) => q.eq("walletId", walletId)
    );
    const cardsInWallet = new Set(walletCards.map((wc) => wc.creditCardId));

    // Return cards not in wallet
    return activeCards.filter((card) => !cardsInWallet.has(card._id));
  },
});
