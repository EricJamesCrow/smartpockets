import { v } from "convex/values";
import { agentQuery } from "../../functions";

export const listReminders = agentQuery({
  args: {
    includeDone: v.optional(v.boolean()),
    withinDays: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { includeDone, withinDays }) => {
    const viewer = ctx.viewerX();
    const reminders = await viewer.edge("reminders");
    const horizon = withinDays
      ? Date.now() + withinDays * 24 * 60 * 60 * 1000
      : Number.POSITIVE_INFINITY;
    const filtered = reminders.filter(
      (r: { isDone: boolean; dueAt: number }) =>
        (includeDone || !r.isDone) && r.dueAt <= horizon,
    );
    return {
      ids: filtered.map((r: { _id: string }) => r._id),
      preview: {
        reminders: filtered,
        live: true,
        capturedAt: new Date().toISOString(),
      },
      window: undefined,
    };
  },
});
