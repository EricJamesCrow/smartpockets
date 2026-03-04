/**
 * Promo Rate Queries
 *
 * All read operations for promotional rate data.
 * Uses Convex Ents for type-safe queries with user ownership verification.
 */

import { v } from "convex/values";
import { query } from "../functions";

/**
 * List all active promo rates for a credit card
 *
 * Returns only promo rates where isActive is true,
 * using the by_card index for efficient querying.
 *
 * @param creditCardId - Credit card document ID
 * @returns Array of active promo rates
 */
export const listByCard = query({
  args: {
    creditCardId: v.id("creditCards"),
  },
  returns: v.array(
    v.object({
      _id: v.id("promoRates"),
      _creationTime: v.number(),
      userId: v.id("users"),
      creditCardId: v.id("creditCards"),
      description: v.string(),
      aprPercentage: v.number(),
      originalBalance: v.number(),
      remainingBalance: v.number(),
      startDate: v.string(),
      expirationDate: v.string(),
      isDeferredInterest: v.boolean(),
      accruedDeferredInterest: v.optional(v.number()),
      monthlyMinimumPayment: v.optional(v.number()),
      isActive: v.boolean(),
      userOverrides: v.optional(
        v.object({
          expirationDate: v.optional(v.string()),
        })
      ),
      isManual: v.optional(v.boolean()),
    })
  ),
  async handler(ctx, { creditCardId }) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(creditCardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Not authorized to view this card's promo rates");
    }

    const promos = await ctx
      .table("promoRates", "creditCardId", (q) => q.eq("creditCardId", creditCardId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .map((promo) => promo.doc());

    return promos;
  },
});
