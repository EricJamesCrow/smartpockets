/**
 * Transaction Overlay Queries
 *
 * Read operations for user-specific transaction overlays (reviews, notes, etc.).
 *
 * SECURITY: All queries verify ownership via authenticated user context.
 */

import { v } from "convex/values";
import { query } from "../functions";

/** Reusable shape for overlay fields returned to clients. */
const overlayFields = {
  isReviewed: v.optional(v.boolean()),
  reviewedAt: v.optional(v.number()),
  isHidden: v.optional(v.boolean()),
  notes: v.optional(v.string()),
  userCategory: v.optional(v.string()),
  userDate: v.optional(v.string()),
  userMerchantName: v.optional(v.string()),
};

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
  returns: v.union(
    v.object({
      plaidTransactionId: v.string(),
      ...overlayFields,
    }),
    v.null()
  ),
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
 * Queries each requested ID individually via the by_plaidTransactionId index
 * to avoid loading all overlays for the user.
 *
 * @param plaidTransactionIds - Array of Plaid transaction IDs
 * @returns Record mapping plaidTransactionId to overlay fields
 */
export const getByTransactionIds = query({
  args: {
    plaidTransactionIds: v.array(v.string()),
  },
  returns: v.record(v.string(), v.object(overlayFields)),
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();

    const uniqueIds = [...new Set(args.plaidTransactionIds)];

    const result: Record<
      string,
      {
        isReviewed?: boolean;
        reviewedAt?: number;
        isHidden?: boolean;
        notes?: string;
        userCategory?: string;
        userDate?: string;
        userMerchantName?: string;
      }
    > = {};

    for (const id of uniqueIds) {
      const overlay = await ctx
        .table("transactionOverlays", "by_plaidTransactionId", (q) =>
          q.eq("plaidTransactionId", id)
        )
        .filter((q) => q.eq(q.field("userId"), viewer._id))
        .first();

      if (overlay) {
        const doc = overlay.doc();
        result[id] = {
          isReviewed: doc.isReviewed,
          reviewedAt: doc.reviewedAt,
          isHidden: doc.isHidden,
          notes: doc.notes,
          userCategory: doc.userCategory,
          userDate: doc.userDate,
          userMerchantName: doc.userMerchantName,
        };
      }
    }

    return result;
  },
});
