/**
 * Wallet Queries
 *
 * Read operations for wallet data.
 * Uses Convex Ents for type-safe queries with user ownership verification.
 */

import { v } from "convex/values";
import { query } from "../functions";

// Shared validators for reuse across queries
const walletBaseValidator = v.object({
  _id: v.id("wallets"),
  _creationTime: v.number(),
  userId: v.id("users"),
  name: v.string(),
  color: v.optional(v.string()),
  icon: v.optional(v.string()),
  isPinned: v.boolean(),
  sortOrder: v.number(),
  pinnedSortOrder: v.number(),
});

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
  isAutoPay: v.boolean(),
  autoPayEnabledAt: v.optional(v.number()),

  // State
  isActive: v.boolean(),
});

// Card preview validator for pinned wallets (minimal data for hover preview)
const cardPreviewValidator = v.object({
  _id: v.id("creditCards"),
  displayName: v.string(),
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
  currentBalance: v.optional(v.number()),
});

/**
 * List all wallets for the current user sorted by sortOrder
 *
 * @returns Array of wallets with cardCount
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("wallets"),
      _creationTime: v.number(),
      userId: v.id("users"),
      name: v.string(),
      color: v.optional(v.string()),
      icon: v.optional(v.string()),
      isPinned: v.boolean(),
      sortOrder: v.number(),
      pinnedSortOrder: v.number(),
      cardCount: v.number(),
    })
  ),
  async handler(ctx) {
    const viewer = ctx.viewerX();

    // Get all wallets for user sorted by sortOrder
    const wallets = await ctx.table("wallets", "by_user_sortOrder", (q) =>
      q.eq("userId", viewer._id)
    );

    // Map wallets with card counts
    // Provide defaults for fields that may be missing in older data
    const walletsWithCounts = await Promise.all(
      wallets.map(async (wallet) => {
        const walletCards = await wallet.edge("walletCards");
        const doc = wallet.doc();
        return {
          ...doc,
          isPinned: doc.isPinned ?? false,
          pinnedSortOrder: doc.pinnedSortOrder ?? 0,
          cardCount: walletCards.length,
        };
      })
    );

    return walletsWithCounts;
  },
});

/**
 * List only pinned wallets for sidebar sorted by pinnedSortOrder
 *
 * @returns Array of pinned wallets with all card data for expansion
 */
export const listPinned = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("wallets"),
      _creationTime: v.number(),
      userId: v.id("users"),
      name: v.string(),
      color: v.optional(v.string()),
      icon: v.optional(v.string()),
      isPinned: v.boolean(),
      sortOrder: v.number(),
      pinnedSortOrder: v.number(),
      cardCount: v.number(),
      cards: v.array(cardPreviewValidator),
    })
  ),
  async handler(ctx) {
    const viewer = ctx.viewer;
    if (!viewer) return [];

    // Get pinned wallets for user
    const allWallets = await ctx.table("wallets", "by_user_pinned", (q) =>
      q.eq("userId", viewer._id).eq("isPinned", true)
    );

    // Sort by pinnedSortOrder in memory (index doesn't cover this)
    const wallets = [...allWallets].sort(
      (a, b) => a.pinnedSortOrder - b.pinnedSortOrder
    );

    // Map wallets with all cards
    const walletsWithCards = await Promise.all(
      wallets.map(async (wallet) => {
        // Get wallet cards sorted by sortOrder
        const walletCards = await ctx.table(
          "walletCards",
          "by_wallet_sortOrder",
          (q) => q.eq("walletId", wallet._id)
        );

        // Get all cards for sidebar expansion
        const cards = await Promise.all(
          walletCards.map(async (walletCard) => {
            const card = await walletCard.edge("creditCard");
            return {
              _id: card._id,
              displayName: card.displayName,
              brand: card.brand,
              lastFour: card.lastFour,
              currentBalance: card.currentBalance,
            };
          })
        );

        const doc = wallet.doc();
        return {
          ...doc,
          isPinned: doc.isPinned ?? false,
          pinnedSortOrder: doc.pinnedSortOrder ?? 0,
          cardCount: walletCards.length,
          cards,
        };
      })
    );

    return walletsWithCards;
  },
});

/**
 * Get a single wallet by ID with computed financial stats
 *
 * Verifies the wallet belongs to the current user.
 *
 * @param walletId - The wallet document ID
 * @returns Wallet with computed stats or null if not found/not owned
 */
export const get = query({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.union(
    v.object({
      _id: v.id("wallets"),
      _creationTime: v.number(),
      userId: v.id("users"),
      name: v.string(),
      color: v.optional(v.string()),
      icon: v.optional(v.string()),
      isPinned: v.boolean(),
      sortOrder: v.number(),
      pinnedSortOrder: v.number(),
      // Computed stats
      cardCount: v.number(),
      totalBalance: v.number(),
      totalCreditLimit: v.number(),
      totalAvailableCredit: v.number(),
      averageUtilization: v.number(),
    }),
    v.null()
  ),
  async handler(ctx, { walletId }) {
    const viewer = ctx.viewerX();
    const wallet = await ctx.table("wallets").get(walletId);

    // Verify ownership
    if (!wallet || wallet.userId !== viewer._id) {
      return null;
    }

    // Get all wallet cards
    const walletCards = await wallet.edge("walletCards");

    // Compute financial stats
    let totalBalance = 0;
    let totalCreditLimit = 0;
    let totalAvailableCredit = 0;

    for (const walletCard of walletCards) {
      const card = await walletCard.edge("creditCard");
      totalBalance += card.currentBalance ?? 0;
      totalCreditLimit += card.creditLimit ?? 0;
      totalAvailableCredit += card.availableCredit ?? 0;
    }

    // Calculate average utilization
    const averageUtilization =
      totalCreditLimit > 0
        ? Math.round((totalBalance / totalCreditLimit) * 100 * 100) / 100
        : 0;

    const doc = wallet.doc();
    return {
      ...doc,
      isPinned: doc.isPinned ?? false,
      pinnedSortOrder: doc.pinnedSortOrder ?? 0,
      cardCount: walletCards.length,
      totalBalance,
      totalCreditLimit,
      totalAvailableCredit,
      averageUtilization,
    };
  },
});

/**
 * Get wallet with full card data for display
 *
 * Verifies the wallet belongs to the current user.
 *
 * @param walletId - The wallet document ID
 * @returns Wallet with array of full card objects or null if not found/not owned
 */
export const getWithCards = query({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.union(
    v.object({
      _id: v.id("wallets"),
      _creationTime: v.number(),
      userId: v.id("users"),
      name: v.string(),
      color: v.optional(v.string()),
      icon: v.optional(v.string()),
      isPinned: v.boolean(),
      sortOrder: v.number(),
      pinnedSortOrder: v.number(),
      cards: v.array(
        v.object({
          walletCardId: v.id("walletCards"),
          sortOrder: v.number(),
          addedAt: v.number(),
          card: creditCardValidator,
        })
      ),
    }),
    v.null()
  ),
  async handler(ctx, { walletId }) {
    const viewer = ctx.viewerX();
    const wallet = await ctx.table("wallets").get(walletId);

    // Verify ownership
    if (!wallet || wallet.userId !== viewer._id) {
      return null;
    }

    // Get wallet cards sorted by sortOrder
    const walletCards = await ctx.table(
      "walletCards",
      "by_wallet_sortOrder",
      (q) => q.eq("walletId", wallet._id)
    );

    // Build full card data with defaults for potentially missing fields
    const cardsWithData = await Promise.all(
      walletCards.map(async (walletCard) => {
        const card = await walletCard.edge("creditCard");
        const cardDoc = card.doc();
        return {
          walletCardId: walletCard._id,
          sortOrder: walletCard.sortOrder,
          addedAt: walletCard.addedAt,
          card: {
            ...cardDoc,
            isAutoPay: cardDoc.isAutoPay ?? false,
          },
        };
      })
    );

    const doc = wallet.doc();
    return {
      ...doc,
      isPinned: doc.isPinned ?? false,
      pinnedSortOrder: doc.pinnedSortOrder ?? 0,
      cards: cardsWithData,
    };
  },
});
