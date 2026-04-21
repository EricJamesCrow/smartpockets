import { v } from "convex/values";
import { agentQuery } from "../../functions";

// W2.11 stub; real body to follow.
export const listReminders = agentQuery({
  args: {
    
    includeDone: v.optional(v.boolean()),
    withinDays: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async () => ({
    ids: [],
    preview: {
      reminders: [],
      live: true,
      capturedAt: new Date().toISOString(),
    },
    window: undefined,
  }),
});
