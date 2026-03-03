/**
 * Installment Plan Queries
 *
 * All read operations for installment plan data.
 * Uses Convex Ents for type-safe queries with user ownership verification.
 */

import { v } from "convex/values";
import { query } from "../functions";

/**
 * List all active installment plans for a credit card
 *
 * Returns only installment plans where isActive is true,
 * using the by_card index for efficient querying.
 *
 * @param creditCardId - Credit card document ID
 * @returns Array of active installment plans
 */
export const listByCard = query({
  args: {
    creditCardId: v.id("creditCards"),
  },
  async handler(ctx, { creditCardId }) {
    const viewer = ctx.viewerX();
    const card = await ctx.table("creditCards").getX(creditCardId);

    // Verify ownership
    if (card.userId !== viewer._id) {
      throw new Error("Not authorized to view this card's installment plans");
    }

    const plans = await ctx
      .table("installmentPlans", "by_card", (q) => q.eq("creditCardId", creditCardId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .map((plan) => plan.doc());

    return plans;
  },
});
