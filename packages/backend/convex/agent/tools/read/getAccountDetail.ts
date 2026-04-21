import { v } from "convex/values";
import { agentQuery } from "../../functions";

// W2.11 stub; real body to follow.
export const getAccountDetail = agentQuery({
  args: { userId: v.id("users"), accountId: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => ({
    ids: [args.accountId],
    preview: {
      account: null,
      live: true,
      capturedAt: new Date().toISOString(),
    },
    window: undefined,
  }),
});
