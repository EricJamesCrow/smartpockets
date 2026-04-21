import { v } from "convex/values";
import { agentQuery } from "../../functions";

/**
 * Reads creditCards.statementClosingDay directly at MVP. Switches to W6's
 * statementReminders in follow-up per contracts §17.
 */
export const getUpcomingStatements = agentQuery({
  args: {
    withinDays: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { withinDays }) => {
    const viewer = ctx.viewerX();
    const cards = await viewer.edge("creditCards");
    const window = withinDays ?? 14;
    const today = new Date();
    const statements: Array<{
      cardId: string;
      displayName: string;
      closingDay: number;
      projectedClosingDate: string;
      daysUntilClose: number;
    }> = [];
    for (const c of cards as Array<{
      _id: string;
      displayName: string;
      statementClosingDay?: number;
      isActive: boolean;
    }>) {
      if (!c.isActive || !c.statementClosingDay) continue;
      const closing = new Date(today);
      closing.setUTCDate(c.statementClosingDay);
      if (closing.getUTCDate() < today.getUTCDate()) {
        closing.setUTCMonth(closing.getUTCMonth() + 1);
      }
      const daysUntilClose = Math.ceil(
        (closing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntilClose <= window) {
        statements.push({
          cardId: c._id,
          displayName: c.displayName,
          closingDay: c.statementClosingDay,
          projectedClosingDate: closing.toISOString().slice(0, 10),
          daysUntilClose,
        });
      }
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
