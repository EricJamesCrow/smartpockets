import { v } from "convex/values";
import { agentQuery } from "../../functions";

type ReminderListRow = {
  _id: string;
  isDone: boolean;
  dueAt: number;
  dismissedAt?: number;
};

export function filterReminderRows(
  reminders: ReminderListRow[],
  opts: { includeDone?: boolean; withinDays?: number; now?: number },
) {
  const horizon = opts.withinDays
    ? (opts.now ?? Date.now()) + opts.withinDays * 24 * 60 * 60 * 1000
    : Number.POSITIVE_INFINITY;
  return reminders.filter(
    (r) =>
      r.dismissedAt === undefined &&
      (opts.includeDone || !r.isDone) &&
      r.dueAt <= horizon,
  );
}

export const listReminders = agentQuery({
  args: {
    includeDone: v.optional(v.boolean()),
    withinDays: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { includeDone, withinDays }) => {
    const viewer = ctx.viewerX();
    const reminders = await viewer.edge("reminders");
    const filtered = filterReminderRows(reminders, { includeDone, withinDays });
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
