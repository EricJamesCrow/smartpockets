/**
 * Credit Card Mutations
 *
 * All write operations for credit card data.
 * Uses Convex Ents for type-safe mutations with user ownership verification.
 */

import { v } from "convex/values";
import { mutation } from "../functions";
import { internalMutation } from "../_generated/server";

/**
 * Toggle card locked status
 *
 * Allows users to lock/unlock cards for organizational purposes.
 * Locked cards are visually marked and excluded from recommendations.
 *
 * @param cardId - Credit card document ID
 * @param isLocked - New locked state
 * @returns Object with isLocked and optional lockedAt timestamp
 */
export const toggleLock = mutation({
  args: {
    cardId: v.id("creditCards"),
    isLocked: v.boolean(),
  },
  returns: v.object({
    isLocked: v.boolean(),
    lockedAt: v.optional(v.number()),
  }),
  async handler(ctx, { cardId, isLocked }) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(cardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Not authorized to modify this card");
    }

    const now = Date.now();
    const lockedAt = isLocked ? now : undefined;

    await card.patch({
      isLocked,
      lockedAt,
    });

    return {
      isLocked,
      lockedAt,
    };
  },
});

/**
 * Toggle card autopay status
 *
 * Allows users to enable/disable autopay for their cards.
 * Mirrors the toggleLock pattern for consistency.
 *
 * @param cardId - Credit card document ID
 * @param isAutoPay - New autopay state
 * @returns Object with isAutoPay and optional autoPayEnabledAt timestamp
 */
export const toggleAutoPay = mutation({
  args: {
    cardId: v.id("creditCards"),
    isAutoPay: v.boolean(),
  },
  returns: v.object({
    isAutoPay: v.boolean(),
    autoPayEnabledAt: v.optional(v.number()),
  }),
  async handler(ctx, { cardId, isAutoPay }) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(cardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Not authorized to modify this card");
    }

    const autoPayEnabledAt = isAutoPay ? Date.now() : undefined;

    await card.patch({
      isAutoPay,
      autoPayEnabledAt,
    });

    return {
      isAutoPay,
      autoPayEnabledAt,
    };
  },
});

/**
 * Update display name for a card
 *
 * Allows users to set a custom display name for their card.
 *
 * @param cardId - Credit card document ID
 * @param displayName - New display name
 */
export const updateDisplayName = mutation({
  args: {
    cardId: v.id("creditCards"),
    displayName: v.string(),
  },
  returns: v.null(),
  async handler(ctx, { cardId, displayName }) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(cardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Not authorized to modify this card");
    }

    await card.patch({ displayName });
    return null;
  },
});

/**
 * Create a new credit card (manual entry)
 *
 * Allows users to manually add credit card information.
 *
 * @param data - Credit card data
 * @returns The new card's document ID
 */
export const create = mutation({
  args: {
    accountId: v.string(),
    accountName: v.string(),
    displayName: v.string(),
    mask: v.optional(v.string()),
    currentBalance: v.optional(v.number()),
    availableCredit: v.optional(v.number()),
    creditLimit: v.optional(v.number()),
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
    nextPaymentDueDate: v.optional(v.string()),
    minimumPaymentAmount: v.optional(v.number()),
  },
  returns: v.id("creditCards"),
  async handler(ctx, data) {
    const viewer = ctx.viewerX();

    // Check if accountId already exists for this user
    const existing = await ctx
      .table("creditCards", "by_accountId", (q) => q.eq("accountId", data.accountId))
      .first();

    if (existing && existing.userId === viewer._id) {
      throw new Error("A card with this account ID already exists");
    }

    const cardId = await ctx.table("creditCards").insert({
      ...data,
      userId: viewer._id,
      isOverdue: false,
      isLocked: false,
      isAutoPay: false,
      isActive: true,
    });

    return cardId;
  },
});

/**
 * Update card information
 *
 * Allows users to update their card details.
 *
 * @param cardId - Credit card document ID
 * @param data - Fields to update
 */
export const update = mutation({
  args: {
    cardId: v.id("creditCards"),
    accountName: v.optional(v.string()),
    displayName: v.optional(v.string()),
    mask: v.optional(v.string()),
    currentBalance: v.optional(v.number()),
    availableCredit: v.optional(v.number()),
    creditLimit: v.optional(v.number()),
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
    nextPaymentDueDate: v.optional(v.string()),
    minimumPaymentAmount: v.optional(v.number()),
    isOverdue: v.optional(v.boolean()),
    statementClosingDay: v.optional(v.number()),
    payOverTimeEnabled: v.optional(v.boolean()),
    payOverTimeLimit: v.optional(v.number()),
    payOverTimeApr: v.optional(v.number()),
  },
  returns: v.null(),
  async handler(ctx, { cardId, ...data }) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(cardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Not authorized to modify this card");
    }

    // Filter out undefined values
    const updates = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(updates).length > 0) {
      await card.patch(updates);
    }

    return null;
  },
});

/**
 * Delete a credit card (soft delete - marks as inactive)
 *
 * @param cardId - Credit card document ID
 */
export const remove = mutation({
  args: {
    cardId: v.id("creditCards"),
  },
  returns: v.null(),
  async handler(ctx, { cardId }) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(cardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Not authorized to delete this card");
    }

    // Soft delete
    await card.patch({ isActive: false });
    return null;
  },
});

/**
 * Permanently delete a credit card
 *
 * @param cardId - Credit card document ID
 */
export const hardDelete = mutation({
  args: {
    cardId: v.id("creditCards"),
  },
  returns: v.null(),
  async handler(ctx, { cardId }) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(cardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Not authorized to delete this card");
    }

    await card.delete();
    return null;
  },
});

// =============================================================================
// PLAID SYNC MUTATIONS (internal only - used by creditCards/actions.ts)
// =============================================================================

import { creditCardValidator } from "./validators";

// =============================================================================
// INTERNAL MUTATIONS (for webhook/scheduled job use - no auth required)
// =============================================================================

/**
 * Internal: Mark credit card as stale
 *
 * Called by scheduled cleanup job when card hasn't been synced recently.
 *
 * @param cardId - Credit card document ID
 */
export const markAsStale = internalMutation({
  args: { cardId: v.id("creditCards") },
  returns: v.null(),
  async handler(ctx, { cardId }) {
    await ctx.db.patch(cardId, {
      syncStatus: "stale",
    });
    return null;
  },
});

/**
 * Internal: Bulk upsert credit cards (denormalized data)
 *
 * Used by webhook-triggered sync actions that don't have auth context.
 * Accepts userId as parameter instead of using viewer.
 *
 * @param userId - User ID (passed from internal action)
 * @param creditCards - Array of credit card data
 */
export const bulkUpsertCreditCardsInternal = internalMutation({
  args: {
    userId: v.string(),
    creditCards: v.array(creditCardValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, creditCards } = args;
    const now = Date.now();

    // Find the user by externalId (Clerk ID)
    const user = await ctx.db
      .query("users")
      .withIndex("externalId", (q) => q.eq("externalId", userId))
      .first();

    if (!user) {
      throw new Error(`User not found for userId: ${userId}`);
    }

    for (const card of creditCards) {
      // Verify ownership
      if (card.userId !== userId) {
        throw new Error("Unauthorized: userId mismatch");
      }

      // Destructure fields that need special handling
      const { userId: cardUserId, isLocked, ...cardData } = card;

      // Idempotent upsert using accountId as unique key
      const existing = await ctx.db
        .query("creditCards")
        .withIndex("by_accountId", (q) => q.eq("accountId", card.accountId))
        .first();

      if (existing) {
        // Update existing record (preserve existing isLocked)
        await ctx.db.patch(existing._id, {
          ...cardData,
          userId: user._id, // Use Convex user ID
          lastSyncedAt: now,
        });
      } else {
        await ctx.db.insert("creditCards", {
          ...cardData,
          userId: user._id, // Use Convex user ID
          isLocked: isLocked ?? false,
          isAutoPay: false,
          lastSyncedAt: now,
        });
      }
    }

    return null;
  },
});

/**
 * Internal: Upsert single credit card (denormalized data)
 *
 * Fallback for individual card sync if batch fails.
 * Used by webhook-triggered sync actions.
 *
 * @param userId - User ID (passed from internal action)
 * @param card - Credit card data
 */
export const upsertCreditCardInternal = internalMutation({
  args: {
    userId: v.string(),
    card: creditCardValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, card } = args;
    const now = Date.now();

    // Verify ownership
    if (card.userId !== userId) {
      throw new Error("Unauthorized: userId mismatch");
    }

    // Destructure fields that need special handling
    const { userId: cardUserId, isLocked, ...cardData } = card;

    // Find the user by externalId (Clerk ID)
    const user = await ctx.db
      .query("users")
      .withIndex("externalId", (q) => q.eq("externalId", userId))
      .first();

    if (!user) {
      throw new Error(`User not found for userId: ${userId}`);
    }

    // Idempotent upsert
    const existing = await ctx.db
      .query("creditCards")
      .withIndex("by_accountId", (q) => q.eq("accountId", card.accountId))
      .first();

    if (existing) {
      // Update existing record (preserve existing isLocked)
      await ctx.db.patch(existing._id, {
        ...cardData,
        userId: user._id,
        lastSyncedAt: now,
      });
    } else {
      await ctx.db.insert("creditCards", {
        ...cardData,
        userId: user._id,
        isLocked: isLocked ?? false,
        isAutoPay: false,
        lastSyncedAt: now,
      });
    }

    return null;
  },
});

/**
 * Internal: Update sync error state for a credit card
 *
 * Called when individual card sync fails.
 * Used by webhook-triggered sync actions.
 *
 * @param userId - User ID (passed from internal action)
 * @param accountId - Plaid account_id
 * @param error - Error message
 */
export const updateSyncErrorInternal = internalMutation({
  args: {
    userId: v.string(),
    accountId: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { accountId, error } = args;

    const card = await ctx.db
      .query("creditCards")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .first();

    if (!card) return null;

    await ctx.db.patch(card._id, {
      syncStatus: "error",
      lastSyncError: error,
      syncAttempts: (card.syncAttempts ?? 0) + 1,
    });

    return null;
  },
});
