/**
 * Statement Snapshot Mutations
 *
 * All write operations for statement snapshot data.
 * Uses Convex Ents for type-safe mutations with user ownership verification.
 */

import { v } from "convex/values";
import { mutation, internalMutation } from "../functions";

/**
 * Create a new statement snapshot
 *
 * Allows users to manually record statement data for a credit card.
 *
 * @param creditCardId - Credit card document ID
 * @param statementDate - Statement closing date
 * @param previousBalance - Balance carried from prior statement
 * @param paymentsAndCredits - Total payments and credits applied
 * @param newPurchases - Total new purchases
 * @param fees - Total fees charged
 * @param interestCharged - Total interest charged
 * @param newBalance - New statement balance
 * @param minimumPaymentDue - Minimum payment required
 * @param dueDate - Payment due date
 * @returns The new snapshot's document ID
 */
export const create = mutation({
  args: {
    creditCardId: v.id("creditCards"),
    statementDate: v.string(),
    previousBalance: v.number(),
    paymentsAndCredits: v.number(),
    newPurchases: v.number(),
    fees: v.number(),
    interestCharged: v.number(),
    newBalance: v.number(),
    minimumPaymentDue: v.number(),
    dueDate: v.string(),
  },
  returns: v.id("statementSnapshots"),
  async handler(ctx, args) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(args.creditCardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Not authorized to add snapshots to this card");
    }

    return await ctx.table("statementSnapshots").insert({
      ...args,
      userId: viewer._id,
      source: "manual" as const,
    });
  },
});

/**
 * Update an existing statement snapshot
 *
 * Allows users to correct statement data. Only provided fields are updated.
 *
 * @param snapshotId - Statement snapshot document ID
 * @param data - Fields to update
 */
export const update = mutation({
  args: {
    snapshotId: v.id("statementSnapshots"),
    previousBalance: v.optional(v.number()),
    paymentsAndCredits: v.optional(v.number()),
    newPurchases: v.optional(v.number()),
    fees: v.optional(v.number()),
    interestCharged: v.optional(v.number()),
    newBalance: v.optional(v.number()),
    minimumPaymentDue: v.optional(v.number()),
    dueDate: v.optional(v.string()),
  },
  returns: v.null(),
  async handler(ctx, { snapshotId, ...data }) {
    const viewer = ctx.viewerX();
    const snapshot = await ctx
      .table("statementSnapshots")
      .getX(snapshotId);

    // Verify ownership
    if (snapshot.userId !== viewer._id) {
      throw new Error("Not authorized to modify this snapshot");
    }

    // Filter out undefined values
    const updates = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(updates).length > 0) {
      await snapshot.patch(updates);
    }

    return null;
  },
});

/**
 * Delete a statement snapshot
 *
 * Permanently removes a statement snapshot.
 *
 * @param snapshotId - Statement snapshot document ID
 */
export const remove = mutation({
  args: {
    snapshotId: v.id("statementSnapshots"),
  },
  returns: v.null(),
  async handler(ctx, { snapshotId }) {
    const viewer = ctx.viewerX();
    const snapshot = await ctx
      .table("statementSnapshots")
      .getX(snapshotId);

    // Verify ownership
    if (snapshot.userId !== viewer._id) {
      throw new Error("Not authorized to delete this snapshot");
    }

    await snapshot.delete();
    return null;
  },
});

// =============================================================================
// INTERNAL MUTATIONS (for automated sync - no auth required)
// =============================================================================

/**
 * Internal: Create an inferred statement snapshot from Plaid sync data
 *
 * Used by automated sync to create snapshots from Plaid liabilities data.
 * Idempotent: skips creation if a snapshot already exists for the same
 * card and statement date.
 *
 * @param userId - User document ID
 * @param creditCardId - Credit card document ID
 * @param statementDate - Statement closing date
 * @param newBalance - Statement balance
 * @param minimumPaymentDue - Minimum payment required
 * @param dueDate - Payment due date
 * @returns The snapshot document ID (existing or newly created)
 */
export const createInferredInternal = internalMutation({
  args: {
    userId: v.id("users"),
    creditCardId: v.id("creditCards"),
    statementDate: v.string(),
    newBalance: v.number(),
    minimumPaymentDue: v.number(),
    dueDate: v.string(),
  },
  returns: v.id("statementSnapshots"),
  async handler(ctx, args) {
    // Idempotent: check if snapshot already exists for this card + date
    const existing = await ctx
      .table("statementSnapshots", "by_card_date", (q) =>
        q
          .eq("creditCardId", args.creditCardId)
          .eq("statementDate", args.statementDate)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.table("statementSnapshots").insert({
      ...args,
      previousBalance: 0,
      paymentsAndCredits: 0,
      newPurchases: 0,
      fees: 0,
      interestCharged: 0,
      source: "inferred" as const,
    });
  },
});
