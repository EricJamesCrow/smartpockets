/**
 * PlaidItem Mutations
 *
 * App-specific write operations for plaidItems.
 *
 * NOTE: Most plaidItem operations are now handled by the Plaid component.
 * This file only contains app-specific mutations that need to clean up
 * app-level data (like creditCards table).
 *
 * Component handles:
 * - createPlaidItem (via exchangePublicToken)
 * - updateItemCursor
 * - updateItemStatus
 * - updateItemLastSyncedAt
 * - updateItemInstitution
 * - togglePlaidItemActive
 * - All internal mutations (markNeedsReauth, setItemError, etc.)
 *
 * See convex/plaidComponent.ts for component wrappers.
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { components } from "../_generated/api";

/**
 * Delete a plaidItem and all associated app-level data
 *
 * Used when user disconnects a bank account.
 *
 * This mutation:
 * 1. Calls component's delete to remove component data (plaidItem, accounts, transactions, etc.)
 * 2. Deletes app-specific data (creditCards table)
 *
 * @param plaidItemId - Component plaidItem ID (string)
 */
export const deletePlaidItem = mutation({
  args: { plaidItemId: v.string() }, // Component returns string IDs
  returns: v.object({
    deleted: v.object({
      plaidItem: v.number(),
      creditCards: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    // Get the item from component to verify it exists and get userId
    const item = await ctx.runQuery(components.plaid.public.getItem, {
      plaidItemId: args.plaidItemId,
    });

    if (!item) {
      throw new Error("Plaid item not found");
    }

    // Step 1: Delete app-specific data (creditCards table)
    const creditCards = await ctx.db
      .query("creditCards")
      .withIndex("by_plaidItemId", (q) => q.eq("plaidItemId", args.plaidItemId))
      .collect();

    for (const card of creditCards) {
      await ctx.db.delete(card._id);
    }

    // Step 2: Delete component data via component mutation
    // This cascade deletes: plaidItem, accounts, transactions, liabilities
    await ctx.runMutation(components.plaid.public.deletePlaidItem, {
      plaidItemId: args.plaidItemId,
    });

    return {
      deleted: {
        plaidItem: 1,
        creditCards: creditCards.length,
      },
    };
  },
});

/**
 * Delete all app-level data for a plaidItem (internal use)
 *
 * Called when component triggers a delete (e.g., via webhook).
 * Only cleans up app-specific tables since component handles its own data.
 *
 * @param plaidItemId - Component plaidItem ID (string)
 */
export const deleteAppDataForPlaidItem = mutation({
  args: { plaidItemId: v.string() },
  returns: v.object({ deletedCreditCards: v.number() }),
  handler: async (ctx, args) => {
    // Delete creditCards
    const creditCards = await ctx.db
      .query("creditCards")
      .withIndex("by_plaidItemId", (q) => q.eq("plaidItemId", args.plaidItemId))
      .collect();

    for (const card of creditCards) {
      await ctx.db.delete(card._id);
    }

    return { deletedCreditCards: creditCards.length };
  },
});
