import { v } from "convex/values";
import { agentQuery } from "../../functions";

// W2.11 stub; real body to follow.
export const listInstallmentPlans = agentQuery({
  args: { userId: v.id("users"), includeInactive: v.optional(v.boolean()) },
  returns: v.any(),
  handler: async () => ({
    ids: [],
    preview: {
      plans: [],
      live: true,
      capturedAt: new Date().toISOString(),
    },
    window: undefined,
  }),
});
