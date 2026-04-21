import { v } from "convex/values";
import { agentQuery } from "../../functions";

// W2.11 stub; real body reads plaidComponent accounts. Deferred until
// `npx convex dev --once` regenerates api types with the agent module.
export const listAccounts = agentQuery({
  args: {
    type: v.optional(
      v.union(
        v.literal("checking"),
        v.literal("savings"),
        v.literal("credit_card"),
        v.literal("loan"),
        v.literal("investment"),
      ),
    ),
  },
  returns: v.any(),
  handler: async () => ({
    ids: [],
    preview: {
      accounts: [],
      live: true,
      capturedAt: new Date().toISOString(),
    },
    window: undefined,
  }),
});
