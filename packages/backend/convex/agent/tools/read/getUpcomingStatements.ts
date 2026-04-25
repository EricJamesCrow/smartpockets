import { v } from "convex/values";
import { agentQuery } from "../../functions";
import {
  daysBetween,
  todayUtcYmd,
} from "../../../intelligence/promoCountdowns/helpers";
import { nextOccurrenceOfDayInMonth } from "../../../intelligence/statementReminders/helpers";

/**
 * Reads from W6 `statementReminders` table (refreshed daily at 07:10 UTC)
 * per contracts §17. Return shape matches the MVP.
 */
export const getUpcomingStatements = agentQuery({
  args: {
    withinDays: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { withinDays }) => {
    const viewer = ctx.viewerX();
    const window = Math.max(0, withinDays ?? 14);
    const today = todayUtcYmd();
    const reminders = await ctx.table(
      "statementReminders",
      "by_user_daysToClose",
      (q) => q.eq("userId", viewer._id),
    );
    const statements: Array<{
      cardId: string;
      displayName: string;
      closingDay: number;
      projectedClosingDate: string;
      daysUntilClose: number;
    }> = [];
    const seenCardIds = new Set<string>();
    for (const r of reminders) {
      if (r.daysToClose > window) continue;
      const card = await ctx.table("creditCards").get(r.creditCardId);
      if (!card || !card.isActive) continue;
      const cardId = r.creditCardId as unknown as string;
      seenCardIds.add(cardId);
      statements.push({
        cardId,
        displayName: card.displayName,
        closingDay: card.statementClosingDay ?? 0,
        projectedClosingDate: r.statementClosingDate,
        daysUntilClose: r.daysToClose,
      });
    }
    const cards = await ctx
      .table("creditCards", "by_user_active", (q) =>
        q.eq("userId", viewer._id).eq("isActive", true),
      );
    for (const card of cards) {
      const cardId = card._id as unknown as string;
      if (seenCardIds.has(cardId)) continue;
      if (card.statementClosingDay == null) continue;
      const projectedClosingDate = nextOccurrenceOfDayInMonth(
        card.statementClosingDay,
        today,
      );
      const daysUntilClose = daysBetween(today, projectedClosingDate);
      if (daysUntilClose < 0 || daysUntilClose > window) continue;
      statements.push({
        cardId,
        displayName: card.displayName,
        closingDay: card.statementClosingDay,
        projectedClosingDate,
        daysUntilClose,
      });
    }
    statements.sort((a, b) => a.daysUntilClose - b.daysUntilClose);
    return {
      ids: statements.map((s) => s.cardId),
      preview: {
        statements,
        live: true,
        capturedAt: new Date().toISOString(),
      },
      window: undefined,
    };
  },
});
