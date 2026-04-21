import { v } from "convex/values";
import { agentMutation } from "../../functions";

// W2.12 stub; real body schedules plaidComponent.syncPlaidItemInternal.
export const triggerPlaidResync = agentMutation({
  args: {
    
    threadId: v.id("agentThreads"),
    plaidItemId: v.optional(v.string()),
    scope: v.optional(
      v.union(
        v.literal("accounts"),
        v.literal("transactions"),
        v.literal("liabilities"),
        v.literal("all"),
      ),
    ),
  },
  returns: v.object({
    scheduledAt: v.number(),
    itemsQueued: v.number(),
  }),
  handler: async () => {
    return { scheduledAt: Date.now(), itemsQueued: 0 };
  },
});
