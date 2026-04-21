import { v } from "convex/values";
import { agentQuery } from "../../functions";

// W2.11 stub; real body to follow.
export const getSpendByCategory = agentQuery({
  args: {
    
    dateFrom: v.string(),
    dateTo: v.string(),
    granularity: v.optional(v.union(v.literal("primary"), v.literal("detailed"))),
  },
  returns: v.any(),
  handler: async (_ctx, args) => ({
    ids: [],
    preview: {
      categories: [],
      live: true,
      capturedAt: new Date().toISOString(),
    },
    window: { from: args.dateFrom, to: args.dateTo },
  }),
});
