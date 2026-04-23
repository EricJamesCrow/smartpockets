import { v } from "convex/values";
import { agentMutation } from "../../functions";
import {
  createProposal,
  registerReversal,
  registerToolExecutor,
  type ExecutorResult,
} from "../../writeTool";

const TOOL_NAME = "propose_reminder_delete";

export const proposeReminderDelete = agentMutation({
  args: {
    threadId: v.id("agentThreads"),
    reminderId: v.id("reminders"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const reminder = await ctx.table("reminders").getX(args.reminderId);
    if (reminder.userId !== viewer._id) throw new Error("not_authorized");

    return await createProposal(ctx, {
      toolName: TOOL_NAME,
      argsJson: JSON.stringify({ reminderId: args.reminderId }),
      summaryText: `Delete reminder "${reminder.title}"`,
      affectedCount: 1,
      affectedIds: [String(args.reminderId)],
      sampleJson: JSON.stringify({ reminderId: args.reminderId }),
      scope: "single",
      threadId: args.threadId,
      awaitingExpiresAt: Date.now() + 5 * 60 * 1000,
    });
  },
});

registerToolExecutor(TOOL_NAME, async (ctx, proposal): Promise<ExecutorResult> => {
  const viewer = ctx.viewerX();
  const parsed = JSON.parse(proposal.argsJson) as { reminderId: string };

  const reminder = await ctx.table("reminders").getX(parsed.reminderId as any);
  if (reminder.userId !== viewer._id) throw new Error("not_authorized");

  await reminder.patch({ dismissedAt: Date.now() } as any);

  return {
    reversalPayload: { kind: "reminder_undismiss", reminderId: parsed.reminderId },
    affectedIds: [parsed.reminderId],
    summary: `Dismissed reminder "${reminder.title}".`,
  };
});

registerReversal(TOOL_NAME, async (ctx, audit) => {
  const viewer = ctx.viewerX();
  const payload = JSON.parse(audit.reversalPayloadJson) as {
    reminderId: string;
  };
  const reminder = await ctx.table("reminders").getX(payload.reminderId as any);
  if (reminder.userId !== viewer._id) throw new Error("not_authorized");
  await reminder.patch({ dismissedAt: undefined } as any);
  return { summary: "Restored reminder." };
});
