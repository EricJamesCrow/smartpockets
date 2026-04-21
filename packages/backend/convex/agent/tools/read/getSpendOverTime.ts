import { v } from "convex/values";
import { agentQuery } from "../../functions";

// W2.11 stub; real body to follow.
export const getSpendOverTime = agentQuery({
  args: {
    
    dateFrom: v.string(),
    dateTo: v.string(),
    bucket: v.union(v.literal("day"), v.literal("week"), v.literal("month")),
  },
  returns: v.any(),
  handler: async (_ctx, args) => ({
    ids: [],
    preview: {
      series: [],
      live: true,
      capturedAt: new Date().toISOString(),
    },
    window: { from: args.dateFrom, to: args.dateTo },
  }),
});
