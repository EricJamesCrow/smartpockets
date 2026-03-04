/**
 * Statement Snapshot Internal Queries
 *
 * Internal queries for automated snapshot generation.
 * Used by the daily cron to find cards with matching closing days.
 */

import { v } from "convex/values";
import { internalQuery } from "../functions";

/**
 * Get all active credit cards whose statementClosingDay matches the given day.
 *
 * Used by the daily snapshot cron to determine which cards need
 * a snapshot generated on a given day of the month.
 *
 * @param closingDay - Day of month (1-31)
 * @returns Array of card objects with fields needed for snapshot creation
 */
export const getCardsWithClosingDay = internalQuery({
  args: {
    closingDay: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("creditCards"),
      userId: v.id("users"),
      currentBalance: v.union(v.number(), v.null()),
      minimumPaymentAmount: v.union(v.number(), v.null()),
      nextPaymentDueDate: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const allCards = await ctx
      .table("creditCards", "by_closingDay_active", (q) =>
        q.eq("statementClosingDay", args.closingDay).eq("isActive", true)
      );
    return allCards.map((card) => ({
      _id: card._id,
      userId: card.userId,
      currentBalance: card.currentBalance ?? null,
      minimumPaymentAmount: card.minimumPaymentAmount ?? null,
      nextPaymentDueDate: card.nextPaymentDueDate ?? null,
    }));
  },
});
