/**
 * Transaction Overlay Queries
 *
 * Read operations for user-specific transaction overlays (reviews, notes, etc.).
 *
 * SECURITY: All queries verify ownership via authenticated user context.
 */

import { v } from "convex/values";
import { query } from "../functions";

/**
 * Get a single overlay by Plaid transaction ID.
 *
 * @param plaidTransactionId - The Plaid transaction ID to look up
 * @returns The overlay document or null if none exists for this user/transaction
 */
export const getByTransactionId = query({
  args: {
    plaidTransactionId: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();

    const overlay = await ctx
      .table("transactionOverlays", "by_plaidTransactionId", (q) =>
        q.eq("plaidTransactionId", args.plaidTransactionId)
      )
      .filter((q) => q.eq(q.field("userId"), viewer._id))
      .first();

    return overlay?.doc() ?? null;
  },
});

/**
 * Get overlays for multiple Plaid transaction IDs (batch lookup).
 *
 * Returns a record keyed by plaidTransactionId with overlay fields.
 * Only includes entries where an overlay exists for the authenticated user.
 *
 * @param plaidTransactionIds - Array of Plaid transaction IDs
 * @returns Record mapping plaidTransactionId to overlay fields
 */
export const getByTransactionIds = query({
  args: {
    plaidTransactionIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();

    // Fetch all overlays for this user
    const allOverlays = await ctx
      .table("transactionOverlays", "userId", (q) =>
        q.eq("userId", viewer._id)
      )
      .map((doc) => doc.doc());

    // Build a set for fast lookup of requested IDs
    const requestedIds = new Set(args.plaidTransactionIds);

    // Build the result record, filtering to only requested IDs
    const result: Record<
      string,
      {
        isReviewed?: boolean;
        isHidden?: boolean;
        notes?: string;
        userCategory?: string;
        userDate?: string;
        userMerchantName?: string;
      }
    > = {};

    for (const overlay of allOverlays) {
      if (requestedIds.has(overlay.plaidTransactionId)) {
        result[overlay.plaidTransactionId] = {
          isReviewed: overlay.isReviewed,
          isHidden: overlay.isHidden,
          notes: overlay.notes,
          userCategory: overlay.userCategory,
          userDate: overlay.userDate,
          userMerchantName: overlay.userMerchantName,
        };
      }
    }

    return result;
  },
});
