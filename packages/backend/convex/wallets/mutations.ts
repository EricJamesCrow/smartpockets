/**
 * Wallet Mutations
 *
 * All write operations for wallet data.
 * Uses Convex Ents for type-safe mutations with user ownership verification.
 */

import { v } from "convex/values";
import { mutation } from "../functions";

/**
 * Create a new wallet
 *
 * Creates a wallet with the given name, optional color/icon.
 * New wallets have isPinned=false, sortOrder assigned (max+1), pinnedSortOrder=0.
 * Enforces maximum 20 wallets per user.
 *
 * @param name - Wallet name
 * @param color - Optional color for the wallet
 * @param icon - Optional icon identifier
 * @returns The new wallet's document ID
 */
export const create = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  returns: v.id("wallets"),
  async handler(ctx, { name, color, icon }) {
    const viewer = ctx.viewerX();

    // Get existing wallets to check limit and calculate next sortOrder
    const existingWallets = await ctx.table("wallets", "by_user_sortOrder", (q) =>
      q.eq("userId", viewer._id)
    );

    // Enforce max 20 wallets per user
    if (existingWallets.length >= 20) {
      throw new Error("Maximum 20 wallets allowed per user");
    }

    // Calculate next sortOrder (max + 1, or 0 if no wallets)
    // Note: Minor race condition possible if two wallets created simultaneously.
    // Queries sort by (sortOrder, _id) to handle any duplicate sortOrder values.
    const maxSortOrder =
      existingWallets.length > 0
        ? Math.max(...existingWallets.map((w) => w.sortOrder))
        : -1;

    // Insert new wallet
    return await ctx.table("wallets").insert({
      userId: viewer._id,
      name,
      color,
      icon,
      isPinned: false,
      sortOrder: maxSortOrder + 1,
      pinnedSortOrder: 0,
    });
  },
});

/**
 * Rename a wallet
 *
 * Updates the name of an existing wallet.
 * Verifies ownership before update.
 *
 * @param walletId - The wallet document ID
 * @param name - New wallet name
 */
export const rename = mutation({
  args: {
    walletId: v.id("wallets"),
    name: v.string(),
  },
  returns: v.null(),
  async handler(ctx, { walletId, name }) {
    const viewer = ctx.viewerX();
    const wallet = await ctx.table("wallets").getX(walletId);

    // Verify ownership
    if (wallet.userId !== viewer._id) {
      throw new Error("Not authorized to modify this wallet");
    }

    await wallet.patch({ name });
    return null;
  },
});

/**
 * Toggle wallet pinned status
 *
 * Toggles whether a wallet appears in the sidebar.
 * When pinning: sets pinnedSortOrder to max+1 of pinned wallets.
 * When unpinning: sets pinnedSortOrder to 0.
 *
 * @param walletId - The wallet document ID
 */
export const togglePin = mutation({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.null(),
  async handler(ctx, { walletId }) {
    const viewer = ctx.viewerX();
    const wallet = await ctx.table("wallets").getX(walletId);

    // Verify ownership
    if (wallet.userId !== viewer._id) {
      throw new Error("Not authorized to modify this wallet");
    }

    const newIsPinned = !wallet.isPinned;
    let newPinnedSortOrder = 0;

    if (newIsPinned) {
      // When pinning, calculate max pinnedSortOrder among pinned wallets
      // Note: Minor race condition possible if multiple wallets pinned simultaneously.
      // Queries sort by (pinnedSortOrder, _id) to handle any duplicates.
      const pinnedWallets = await ctx.table("wallets", "by_user_pinned", (q) =>
        q.eq("userId", viewer._id).eq("isPinned", true)
      );

      const maxPinnedSortOrder =
        pinnedWallets.length > 0
          ? Math.max(...pinnedWallets.map((w) => w.pinnedSortOrder))
          : -1;

      newPinnedSortOrder = maxPinnedSortOrder + 1;
    }

    await wallet.patch({
      isPinned: newIsPinned,
      pinnedSortOrder: newPinnedSortOrder,
    });

    return null;
  },
});

/**
 * Update wallet sort order
 *
 * Batch updates sortOrder for all wallets in the array order.
 * Used for drag-and-drop reordering on the /wallets page.
 * Verifies ownership of all wallets before updating.
 *
 * @param walletIds - Array of wallet IDs in the desired order
 */
export const updateSortOrder = mutation({
  args: {
    walletIds: v.array(v.id("wallets")),
  },
  returns: v.null(),
  async handler(ctx, { walletIds }) {
    const viewer = ctx.viewerX();

    // Update each wallet's sortOrder based on array position
    for (let i = 0; i < walletIds.length; i++) {
      const walletId = walletIds[i];
      if (!walletId) continue;

      const wallet = await ctx.table("wallets").getX(walletId);

      // Verify ownership
      if (wallet.userId !== viewer._id) {
        throw new Error("Not authorized to modify this wallet");
      }

      await wallet.patch({ sortOrder: i });
    }

    return null;
  },
});

/**
 * Update wallet pinned sort order
 *
 * Batch updates pinnedSortOrder for all wallets in the array order.
 * Used for drag-and-drop reordering in the sidebar.
 * Verifies ownership of all wallets before updating.
 *
 * @param walletIds - Array of pinned wallet IDs in the desired order
 */
export const updatePinnedSortOrder = mutation({
  args: {
    walletIds: v.array(v.id("wallets")),
  },
  returns: v.null(),
  async handler(ctx, { walletIds }) {
    const viewer = ctx.viewerX();

    // Update each wallet's pinnedSortOrder based on array position
    for (let i = 0; i < walletIds.length; i++) {
      const walletId = walletIds[i];
      if (!walletId) continue;

      const wallet = await ctx.table("wallets").getX(walletId);

      // Verify ownership
      if (wallet.userId !== viewer._id) {
        throw new Error("Not authorized to modify this wallet");
      }

      // Validate wallet is pinned
      if (!wallet.isPinned) {
        throw new Error("Cannot update pinnedSortOrder on unpinned wallet");
      }

      await wallet.patch({ pinnedSortOrder: i });
    }

    return null;
  },
});

/**
 * Delete a wallet
 *
 * Removes a wallet and all its walletCard associations.
 * The credit cards themselves are NOT deleted - only the associations.
 * Verifies ownership before deletion.
 *
 * @param walletId - The wallet document ID
 */
export const remove = mutation({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.null(),
  async handler(ctx, { walletId }) {
    const viewer = ctx.viewerX();
    const wallet = await ctx.table("wallets").getX(walletId);

    // Verify ownership
    if (wallet.userId !== viewer._id) {
      throw new Error("Not authorized to delete this wallet");
    }

    // Delete all walletCard associations first
    // Use .get() instead of .getX() to handle race conditions where a walletCard
    // might be deleted between the edge traversal and the fetch
    const walletCards = await wallet.edge("walletCards");
    for (const walletCard of walletCards) {
      const writableWalletCard = await ctx.table("walletCards").get(walletCard._id);
      if (writableWalletCard) {
        await writableWalletCard.delete();
      }
    }

    // Delete the wallet
    await wallet.delete();
    return null;
  },
});
