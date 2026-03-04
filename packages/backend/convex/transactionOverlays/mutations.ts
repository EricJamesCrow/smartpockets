/**
 * Transaction Overlay Mutations
 *
 * Write operations for user-specific transaction overlays.
 * Allows users to annotate transactions with notes, custom categories,
 * review status, and visibility toggles.
 *
 * SECURITY: All mutations verify ownership via authenticated user context.
 */

import { v } from "convex/values";
import { mutation } from "../functions";

/**
 * Upsert a single field on a transaction overlay.
 *
 * Creates the overlay if it doesn't exist, or patches the field if it does.
 * When value is null the field is cleared (set to undefined).
 *
 * @param plaidTransactionId - The Plaid transaction ID to overlay
 * @param field - Which overlay field to set
 * @param value - The value to set, or null to clear
 */
export const upsertField = mutation({
  args: {
    plaidTransactionId: v.string(),
    field: v.union(
      v.literal("notes"),
      v.literal("userCategory"),
      v.literal("userDate"),
      v.literal("userMerchantName")
    ),
    value: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  async handler(ctx, { plaidTransactionId, field, value }) {
    const viewer = ctx.viewerX();

    const existing = await ctx
      .table("transactionOverlays", "by_user_and_transaction", (q) =>
        q.eq("userId", viewer._id).eq("plaidTransactionId", plaidTransactionId)
      )
      .first();

    const fieldValue = value === null ? undefined : value;

    if (existing) {
      await existing.patch({ [field]: fieldValue });
    } else {
      await ctx.table("transactionOverlays").insert({
        userId: viewer._id,
        plaidTransactionId,
        [field]: fieldValue,
      });
    }

    return null;
  },
});

/**
 * Toggle the reviewed status of a transaction.
 *
 * Sets isReviewed and records reviewedAt timestamp when marking as reviewed.
 * Clears reviewedAt when un-reviewing.
 *
 * @param plaidTransactionId - The Plaid transaction ID
 * @param isReviewed - Whether the transaction is reviewed
 */
export const toggleReviewed = mutation({
  args: {
    plaidTransactionId: v.string(),
    isReviewed: v.boolean(),
  },
  returns: v.null(),
  async handler(ctx, { plaidTransactionId, isReviewed }) {
    const viewer = ctx.viewerX();

    const existing = await ctx
      .table("transactionOverlays", "by_user_and_transaction", (q) =>
        q.eq("userId", viewer._id).eq("plaidTransactionId", plaidTransactionId)
      )
      .first();

    const reviewedAt = isReviewed ? Date.now() : undefined;

    if (existing) {
      await existing.patch({ isReviewed, reviewedAt });
    } else {
      await ctx.table("transactionOverlays").insert({
        userId: viewer._id,
        plaidTransactionId,
        isReviewed,
        reviewedAt,
      });
    }

    return null;
  },
});

/**
 * Toggle the hidden status of a transaction.
 *
 * Hidden transactions are excluded from default views but remain in the database.
 *
 * @param plaidTransactionId - The Plaid transaction ID
 * @param isHidden - Whether the transaction is hidden
 */
export const toggleHidden = mutation({
  args: {
    plaidTransactionId: v.string(),
    isHidden: v.boolean(),
  },
  returns: v.null(),
  async handler(ctx, { plaidTransactionId, isHidden }) {
    const viewer = ctx.viewerX();

    const existing = await ctx
      .table("transactionOverlays", "by_user_and_transaction", (q) =>
        q.eq("userId", viewer._id).eq("plaidTransactionId", plaidTransactionId)
      )
      .first();

    if (existing) {
      await existing.patch({ isHidden });
    } else {
      await ctx.table("transactionOverlays").insert({
        userId: viewer._id,
        plaidTransactionId,
        isHidden,
      });
    }

    return null;
  },
});
