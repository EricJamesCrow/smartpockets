/**
 * PlaidItem Queries
 *
 * All read operations for plaidItems.
 *
 * NOTE: PlaidItems are stored in the Plaid component's internal tables.
 * These queries delegate to the component via `components.plaid.public.*`.
 */

import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { components } from "../_generated/api";

// Type for plaidItem returned from component (component returns string IDs)
type ComponentPlaidItem = {
  _id: string;
  userId: string;
  itemId: string;
  institutionId?: string;
  institutionName?: string;
  products: string[];
  isActive?: boolean;
  status: string;
  syncError?: string;
  createdAt: number;
  lastSyncedAt?: number;
};

/**
 * Safe PlaidItem type (without accessToken) for frontend use.
 */
export type SafePlaidItem = Omit<ComponentPlaidItem, "accessToken">;

/**
 * Check if a PlaidItem is active
 */
function isPlaidItemActive(item: ComponentPlaidItem): boolean {
  return item.isActive === undefined || item.isActive === true;
}

/**
 * Get plaidItem by Plaid's item_id (safe - no accessToken)
 *
 * Used by webhook handler to look up item details.
 * Delegates to component query.
 *
 * @param item_id - Plaid item_id from webhook payload
 * @returns plaidItem (without accessToken) or null if not found
 */
export const getItemByItemId = query({
  args: { item_id: v.string() },
  returns: v.union(
    v.object({
      _id: v.string(),
      userId: v.string(),
      itemId: v.string(),
      institutionId: v.optional(v.string()),
      institutionName: v.optional(v.string()),
      products: v.array(v.string()),
      isActive: v.optional(v.boolean()),
      status: v.string(),
      syncError: v.optional(v.string()),
      createdAt: v.number(),
      lastSyncedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Query from component - it returns items by Plaid's item_id
    const item = await ctx.runQuery(components.plaid.public.getItem, {
      plaidItemId: args.item_id,
    });

    return item ?? null;
  },
});

/**
 * Get all plaidItems for a user (safe - no accessToken)
 *
 * Delegates to component query.
 *
 * @param userId - Clerk user ID
 * @returns Array of plaidItems (without accessToken)
 */
export const getItemsByUserId = query({
  args: { userId: v.string() },
  returns: v.array(
    v.object({
      _id: v.string(),
      userId: v.string(),
      itemId: v.string(),
      institutionId: v.optional(v.string()),
      institutionName: v.optional(v.string()),
      products: v.array(v.string()),
      isActive: v.optional(v.boolean()),
      status: v.string(),
      syncError: v.optional(v.string()),
      createdAt: v.number(),
      lastSyncedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    // Query from component
    const items = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: args.userId,
    });

    return items;
  },
});

/**
 * Get only active plaidItems for a user (safe - no accessToken)
 *
 * Filters out items where isActive === false.
 * Used for displaying data in the UI (credit cards, transactions, etc.)
 *
 * @param userId - Clerk user ID
 * @returns Array of active plaidItems only (without accessToken)
 */
export const getActiveItemsByUserId = query({
  args: { userId: v.string() },
  returns: v.array(
    v.object({
      _id: v.string(),
      userId: v.string(),
      itemId: v.string(),
      institutionId: v.optional(v.string()),
      institutionName: v.optional(v.string()),
      products: v.array(v.string()),
      isActive: v.optional(v.boolean()),
      status: v.string(),
      syncError: v.optional(v.string()),
      createdAt: v.number(),
      lastSyncedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    // Query from component
    const allItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: args.userId,
    });

    // Filter to only items where isActive is true or undefined (backward compatibility)
    return allItems.filter(isPlaidItemActive);
  },
});

/**
 * Get all active plaidItems (across all users)
 *
 * Used by scheduled sync to sync all connected accounts.
 *
 * @returns Array of active/pending plaidItems
 */
export const getAllActivePlaidItems = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.string(),
      userId: v.string(),
      itemId: v.string(),
      institutionId: v.optional(v.string()),
      institutionName: v.optional(v.string()),
      products: v.array(v.string()),
      isActive: v.optional(v.boolean()),
      status: v.string(),
      syncError: v.optional(v.string()),
      createdAt: v.number(),
      lastSyncedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    // Query ALL active items from component
    const allItems = await ctx.runQuery(
      components.plaid.public.getAllActiveItems,
      {}
    );

    return allItems;
  },
});

// =============================================================================
// INTERNAL QUERIES (for use by other Convex functions only)
// =============================================================================

/**
 * Get plaidItem by component document ID (internal only)
 *
 * Used by sync actions to fetch item data.
 * Not exposed to frontend - only callable by other Convex functions.
 *
 * @param itemId - Component plaidItem ID (string)
 * @returns plaidItem or null if not found
 */
export const getItemById = internalQuery({
  args: { itemId: v.string() }, // Component returns string IDs
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.plaid.public.getItem, {
      plaidItemId: args.itemId,
    });
  },
});

/**
 * Get plaidItem by Plaid's item_id (internal)
 *
 * Used by webhook handler to look up full item data.
 * Not exposed to frontend - only callable by other Convex functions.
 *
 * @param itemId - Plaid's item_id (not component _id)
 * @returns plaidItem or null if not found
 */
export const getByPlaidItemId = internalQuery({
  args: { itemId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.plaid.public.getItemByPlaidItemId, {
      itemId: args.itemId,
    });
  },
});

/**
 * Get all active plaidItems (internal)
 *
 * Used by scheduled sync and webhook handlers to get all syncable items.
 * Not exposed to frontend - only callable by other Convex functions.
 *
 * @returns Array of active/pending plaidItems
 */
export const getAllActiveInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Query ALL active items from component
    const allItems = await ctx.runQuery(
      components.plaid.public.getAllActiveItems,
      {}
    );

    return allItems;
  },
});
