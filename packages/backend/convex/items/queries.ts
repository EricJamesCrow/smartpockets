/**
 * PlaidItem Queries
 *
 * All read operations for plaidItems.
 *
 * NOTE: PlaidItems are stored in the Plaid component's internal tables.
 * These queries delegate to the component via `components.plaid.public.*`.
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { components } from "../_generated/api";
import { query } from "../functions";

// Type for plaidItem returned from component (component returns string IDs)
type ComponentPlaidItem = {
  _id: string;
  _creationTime?: number;
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
  activatedAt?: number;
  errorCode?: string;
  errorMessage?: string;
  errorAt?: number;
  reauthReason?: string;
  reauthAt?: number;
  disconnectedReason?: string;
  disconnectedAt?: number;
  circuitState?: string;
  consecutiveFailures?: number;
  lastFailureAt?: number;
  nextRetryAt?: number;
  newAccountsAvailableAt?: number;
  firstErrorAt?: number;
  lastDispatchedAt?: number;
};

/**
 * Safe PlaidItem type (without accessToken) for frontend use.
 */
export type SafePlaidItem = {
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

const safePlaidItemValidator = v.object({
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
});

function serializePlaidItem(item: ComponentPlaidItem): SafePlaidItem {
  return {
    _id: item._id,
    userId: item.userId,
    itemId: item.itemId,
    institutionId: item.institutionId,
    institutionName: item.institutionName,
    products: item.products,
    isActive: item.isActive,
    status: item.status,
    syncError: item.syncError,
    createdAt: item.createdAt,
    lastSyncedAt: item.lastSyncedAt,
  };
}

function assertViewerCanReadUserId(
  viewer: { externalId: string },
  userId: string
) {
  if (viewer.externalId !== userId) {
    throw new Error("Not authorized to view Plaid items for this user");
  }
}

/**
 * Check if a PlaidItem is active
 */
function isPlaidItemActive(item: ComponentPlaidItem): boolean {
  return item.isActive === undefined || item.isActive === true;
}

/**
 * Get plaidItem by Plaid's item_id (safe - no accessToken)
 *
 * Browser-callable lookup for the authenticated viewer.
 * Delegates to component query and returns null for another user's item.
 *
 * @param item_id - Plaid item_id from webhook payload
 * @returns plaidItem (without accessToken) or null if not found or unauthorized
 */
export const getItemByItemId = query({
  args: { item_id: v.string() },
  returns: v.union(safePlaidItemValidator, v.null()),
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();

    // Query from component - it returns items by Plaid's item_id
    const item = await ctx.runQuery(components.plaid.public.getItemByPlaidItemId, {
      itemId: args.item_id,
    });

    if (!item || item.userId !== viewer.externalId) {
      return null;
    }

    return serializePlaidItem(item);
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
  returns: v.array(safePlaidItemValidator),
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    assertViewerCanReadUserId(viewer, args.userId);

    // Query from component
    const items = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: args.userId,
    });

    return items.map(serializePlaidItem);
  },
});

/**
 * Get all plaidItems for the authenticated viewer (safe - no accessToken).
 *
 * Browser-callable institution flows should use this instead of passing userId.
 */
export const getItemsForViewer = query({
  args: {},
  returns: v.array(safePlaidItemValidator),
  handler: async (ctx) => {
    const viewer = ctx.viewerX();
    const items = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: viewer.externalId,
    });

    return items.map(serializePlaidItem);
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
  returns: v.array(safePlaidItemValidator),
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    assertViewerCanReadUserId(viewer, args.userId);

    // Query from component
    const allItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: args.userId,
    });

    // Filter to only items where isActive is true or undefined (backward compatibility)
    return allItems.filter(isPlaidItemActive).map(serializePlaidItem);
  },
});

/**
 * Get only active plaidItems for the authenticated viewer.
 */
export const getActiveItemsForViewer = query({
  args: {},
  returns: v.array(safePlaidItemValidator),
  handler: async (ctx) => {
    const viewer = ctx.viewerX();
    const allItems = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: viewer.externalId,
    });

    return allItems.filter(isPlaidItemActive).map(serializePlaidItem);
  },
});

/**
 * Get all active plaidItems (across all users)
 *
 * Used by scheduled sync to sync all connected accounts.
 *
 * @returns Array of active/pending plaidItems
 */
export const getAllActivePlaidItems = internalQuery({
  args: {},
  returns: v.array(safePlaidItemValidator),
  handler: async (ctx) => {
    // Query ALL active items from component
    const allItems = await ctx.runQuery(
      components.plaid.public.getAllActiveItems,
      {}
    );

    return allItems.map(serializePlaidItem);
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
  returns: v.union(safePlaidItemValidator, v.null()),
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(components.plaid.public.getItem, {
      plaidItemId: args.itemId,
    });

    return item ? serializePlaidItem(item) : null;
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
  returns: v.union(safePlaidItemValidator, v.null()),
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(components.plaid.public.getItemByPlaidItemId, {
      itemId: args.itemId,
    });

    return item ? serializePlaidItem(item) : null;
  },
});

export const getItemsByTrustedUserId = internalQuery({
  args: { userId: v.string() },
  returns: v.array(safePlaidItemValidator),
  handler: async (ctx, args) => {
    const items = await ctx.runQuery(components.plaid.public.getItemsByUser, {
      userId: args.userId,
    });

    return items.map(serializePlaidItem);
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
  returns: v.array(safePlaidItemValidator),
  handler: async (ctx) => {
    // Query ALL active items from component
    const allItems = await ctx.runQuery(
      components.plaid.public.getAllActiveItems,
      {}
    );

    return allItems.map(serializePlaidItem);
  },
});
