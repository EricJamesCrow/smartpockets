import { v } from "convex/values";
import { agentQuery } from "../../functions";

// W2.11 stub; real body reads creditCards.statementClosingDay directly.
// Switches to W6's statementReminders in follow-up (contracts §17).
export const getUpcomingStatements = agentQuery({
  args: {
    
    withinDays: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async () => ({
    ids: [],
    preview: {
      statements: [],
      live: true,
      capturedAt: new Date().toISOString(),
    },
    window: undefined,
  }),
});
