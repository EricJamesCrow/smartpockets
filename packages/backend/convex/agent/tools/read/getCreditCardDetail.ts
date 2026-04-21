import { v } from "convex/values";
import { agentQuery } from "../../functions";

// W2.11 stub; real body to follow.
export const getCreditCardDetail = agentQuery({
  args: { userId: v.id("users"), cardId: v.id("creditCards") },
  returns: v.any(),
  handler: async (_ctx, args) => ({
    ids: [args.cardId],
    preview: {
      card: null,
      live: true,
      capturedAt: new Date().toISOString(),
    },
    window: undefined,
  }),
});
