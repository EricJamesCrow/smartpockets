import { v } from "convex/values";
import { agentQuery } from "../../functions";

// W2.11 stub; real body to follow.
export const listCreditCards = agentQuery({
  args: {
    
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async () => ({
    ids: [],
    preview: {
      cards: [],
      live: true,
      capturedAt: new Date().toISOString(),
    },
    window: undefined,
  }),
});
