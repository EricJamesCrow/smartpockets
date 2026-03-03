/**
 * Statement Snapshot Queries
 *
 * All read operations for statement snapshot data.
 * Uses Convex Ents for type-safe queries with user ownership verification.
 */

import { v } from "convex/values";
import { query } from "../functions";

/**
 * List all statement snapshots for a credit card
 *
 * Returns snapshots ordered by most recent first.
 *
 * @param creditCardId - Credit card document ID
 * @returns Array of statement snapshots
 */
export const listByCard = query({
  args: {
    creditCardId: v.id("creditCards"),
  },
  returns: v.array(
    v.object({
      _id: v.id("statementSnapshots"),
      _creationTime: v.number(),
      userId: v.id("users"),
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
      source: v.union(v.literal("manual"), v.literal("inferred")),
    })
  ),
  async handler(ctx, { creditCardId }) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(creditCardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Not authorized to view this card's snapshots");
    }

    const snapshots = await ctx
      .table("statementSnapshots", "creditCardId", (q) =>
        q.eq("creditCardId", creditCardId)
      )
      .order("desc")
      .map((snapshot) => snapshot.doc());

    return snapshots;
  },
});

/**
 * Get the latest two statement snapshots for a credit card
 *
 * Returns the current and previous snapshots for comparison.
 *
 * @param creditCardId - Credit card document ID
 * @returns Object with current and previous snapshots (or null)
 */
export const getLatest = query({
  args: {
    creditCardId: v.id("creditCards"),
  },
  returns: v.object({
    current: v.union(
      v.object({
        _id: v.id("statementSnapshots"),
        _creationTime: v.number(),
        userId: v.id("users"),
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
        source: v.union(v.literal("manual"), v.literal("inferred")),
      }),
      v.null()
    ),
    previous: v.union(
      v.object({
        _id: v.id("statementSnapshots"),
        _creationTime: v.number(),
        userId: v.id("users"),
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
        source: v.union(v.literal("manual"), v.literal("inferred")),
      }),
      v.null()
    ),
  }),
  async handler(ctx, { creditCardId }) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(creditCardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Not authorized to view this card's snapshots");
    }

    const snapshots = await ctx
      .table("statementSnapshots", "creditCardId", (q) =>
        q.eq("creditCardId", creditCardId)
      )
      .order("desc")
      .take(2)
      .map((snapshot) => snapshot.doc());

    return {
      current: snapshots[0] ?? null,
      previous: snapshots[1] ?? null,
    };
  },
});

/**
 * Get a statement snapshot by card and date
 *
 * @param creditCardId - Credit card document ID
 * @param statementDate - Statement date string (e.g. "2025-01-15")
 * @returns The matching snapshot or null
 */
export const getByDate = query({
  args: {
    creditCardId: v.id("creditCards"),
    statementDate: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("statementSnapshots"),
      _creationTime: v.number(),
      userId: v.id("users"),
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
      source: v.union(v.literal("manual"), v.literal("inferred")),
    }),
    v.null()
  ),
  async handler(ctx, { creditCardId, statementDate }) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(creditCardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Not authorized to view this card's snapshots");
    }

    const snapshot = await ctx
      .table("statementSnapshots", "by_card_date", (q) =>
        q.eq("creditCardId", creditCardId).eq("statementDate", statementDate)
      )
      .first();

    return snapshot?.doc() ?? null;
  },
});
