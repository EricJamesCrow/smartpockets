/**
 * WalletCards Mutations
 *
 * Mutation functions for managing cards within wallets (the junction table).
 * Uses Convex Ents for type-safe mutations with ownership verification.
 */

import { v } from "convex/values";
import { mutation } from "../functions";

/**
 * Add multiple cards to a wallet
 *
 * Verifies wallet ownership and card ownership for each card.
 * Skips cards that are already in the wallet.
 * Sets sortOrder = max existing + index, addedAt = Date.now().
 *
 * @param walletId - The wallet document ID
 * @param cardIds - Array of credit card document IDs to add
 * @returns Number of cards actually added
 */
export const addCards = mutation({
  args: {
    walletId: v.id("wallets"),
    cardIds: v.array(v.id("creditCards")),
  },
  returns: v.number(),
  async handler(ctx, { walletId, cardIds }) {
    const viewer = ctx.viewerX();

    // Verify wallet ownership
    const wallet = await ctx.table("wallets").getX(walletId);
    if (wallet.userId !== viewer._id) {
      throw new Error("Not authorized to modify this wallet");
    }

    // Get existing cards in wallet to find max sortOrder and avoid duplicates
    const existingWalletCards = await ctx.table(
      "walletCards",
      "by_wallet_sortOrder",
      (q) => q.eq("walletId", walletId)
    );
    const existingCardIds = new Set(
      existingWalletCards.map((wc) => wc.creditCardId)
    );
    // Note: Minor race condition possible if cards added simultaneously.
    // Queries sort by (sortOrder, _id) to handle any duplicate sortOrder values.
    const maxSortOrder =
      existingWalletCards.length > 0
        ? Math.max(...existingWalletCards.map((wc) => wc.sortOrder))
        : -1;

    let addedCount = 0;
    const now = Date.now();

    for (const cardId of cardIds) {
      // Skip if already in wallet
      if (existingCardIds.has(cardId)) continue;

      // Verify card ownership
      const card = await ctx.table("creditCards").get(cardId);
      if (!card || card.userId !== viewer._id) continue;

      // Add to wallet
      await ctx.table("walletCards").insert({
        walletId,
        creditCardId: cardId,
        sortOrder: maxSortOrder + 1 + addedCount,
        addedAt: now,
      });
      addedCount++;
    }

    return addedCount;
  },
});

/**
 * Remove a single card from a wallet
 *
 * Finds and deletes the walletCard junction record.
 * Does NOT delete the credit card itself.
 * Verifies wallet ownership before deletion.
 *
 * @param walletId - The wallet document ID
 * @param cardId - The credit card document ID to remove
 */
export const removeCard = mutation({
  args: {
    walletId: v.id("wallets"),
    cardId: v.id("creditCards"),
  },
  returns: v.null(),
  async handler(ctx, { walletId, cardId }) {
    const viewer = ctx.viewerX();

    // Verify wallet ownership
    const wallet = await ctx.table("wallets").getX(walletId);
    if (wallet.userId !== viewer._id) {
      throw new Error("Not authorized to modify this wallet");
    }

    // Find the walletCard junction record
    const walletCards = await ctx.table(
      "walletCards",
      "by_wallet_sortOrder",
      (q) => q.eq("walletId", walletId)
    );

    const walletCard = walletCards.find((wc) => wc.creditCardId === cardId);
    if (!walletCard) {
      // Card not in wallet - nothing to do
      return null;
    }

    // Delete the junction record (not the card itself)
    const writableWalletCard = await ctx.table("walletCards").getX(walletCard._id);
    await writableWalletCard.delete();

    return null;
  },
});

/**
 * Remove multiple cards from a wallet
 *
 * Bulk removes cards from a wallet.
 * Does NOT delete the credit cards themselves.
 * Verifies wallet ownership before deletion.
 *
 * @param walletId - The wallet document ID
 * @param cardIds - Array of credit card document IDs to remove
 * @returns Number of cards actually removed
 */
export const removeCards = mutation({
  args: {
    walletId: v.id("wallets"),
    cardIds: v.array(v.id("creditCards")),
  },
  returns: v.number(),
  async handler(ctx, { walletId, cardIds }) {
    const viewer = ctx.viewerX();

    // Verify wallet ownership
    const wallet = await ctx.table("wallets").getX(walletId);
    if (wallet.userId !== viewer._id) {
      throw new Error("Not authorized to modify this wallet");
    }

    // Get all walletCards for this wallet
    const walletCards = await ctx.table(
      "walletCards",
      "by_wallet_sortOrder",
      (q) => q.eq("walletId", walletId)
    );

    // Build a set of cardIds to remove for O(1) lookup
    const cardIdsToRemove = new Set(cardIds);

    let removedCount = 0;

    for (const walletCard of walletCards) {
      if (cardIdsToRemove.has(walletCard.creditCardId)) {
        // Delete the junction record (not the card itself)
        const writableWalletCard = await ctx.table("walletCards").get(walletCard._id);
        if (writableWalletCard) {
          await writableWalletCard.delete();
          removedCount++;
        }
      }
    }

    return removedCount;
  },
});

/**
 * Update the sort order of a card within a wallet
 *
 * Updates the sortOrder field for drag-drop reordering.
 * Verifies the walletCard's wallet belongs to the current user.
 *
 * @param walletCardId - The walletCard junction document ID
 * @param sortOrder - New sort order value
 */
export const updateSortOrder = mutation({
  args: {
    walletCardId: v.id("walletCards"),
    sortOrder: v.number(),
  },
  returns: v.null(),
  async handler(ctx, { walletCardId, sortOrder }) {
    const viewer = ctx.viewerX();

    // Get the walletCard
    const walletCard = await ctx.table("walletCards").getX(walletCardId);

    // Traverse to wallet to verify ownership
    const wallet = await walletCard.edge("wallet");
    if (wallet.userId !== viewer._id) {
      throw new Error("Not authorized to modify this wallet");
    }

    // Update sortOrder
    await walletCard.patch({ sortOrder });

    return null;
  },
});
