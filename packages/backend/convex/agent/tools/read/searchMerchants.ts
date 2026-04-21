import { v } from "convex/values";
import { agentQuery } from "../../functions";

// W2.11 stub; real body to follow. Literal fuzzy over merchantName /
// counterpartyName in plaidTransactions; scored by transaction count.
export const searchMerchants = agentQuery({
  args: {
    
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async () => ({
    ids: [],
    preview: {
      merchants: [],
      live: true,
      capturedAt: new Date().toISOString(),
    },
    window: undefined,
  }),
});
