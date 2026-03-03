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
  handler: async (ctx, args) => {
    const allCards = await ctx.table("creditCards").filter((q) =>
      q.and(
        q.eq(q.field("isActive"), true),
        q.eq(q.field("statementClosingDay"), args.closingDay),
      ),
    );
    return allCards.map((card) => ({
      _id: card._id,
      userId: card.userId,
      currentBalance: card.currentBalance,
      minimumPaymentAmount: card.minimumPaymentAmount,
      nextPaymentDueDate: card.nextPaymentDueDate,
    }));
  },
});
