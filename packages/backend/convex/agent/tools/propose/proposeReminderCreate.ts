import { v } from "convex/values";
import { agentMutation } from "../../functions";
import {
  createProposal,
  registerReversal,
  registerToolExecutor,
  type ExecutorResult,
} from "../../writeTool";

const TOOL_NAME = "propose_reminder_create";

type RelatedResourceType =
  | "creditCard"
  | "promoRate"
  | "installmentPlan"
  | "transaction"
  | "none";

interface ReminderInput {
  title: string;
  dueAt: number;
  notes?: string;
  relatedResourceType: RelatedResourceType;
  relatedResourceId?: string;
}

function coerce(input: unknown): ReminderInput {
  if (input == null || typeof input !== "object") {
    throw new Error("invalid_args: reminder payload missing");
  }
  const src = input as Record<string, unknown>;
  const title = String(src.title ?? "").trim();
  const dueAt = Number(src.dueAt ?? 0);
  if (!title) throw new Error("invalid_args: title required");
  if (!Number.isFinite(dueAt) || dueAt <= 0) {
    throw new Error("invalid_args: dueAt must be a positive timestamp");
  }
  const relatedResourceType = (src.relatedResourceType ?? "none") as RelatedResourceType;
  return {
    title,
    dueAt,
    notes: typeof src.notes === "string" ? src.notes : undefined,
    relatedResourceType,
    relatedResourceId:
      typeof src.relatedResourceId === "string" ? src.relatedResourceId : undefined,
  };
}

export function buildReminderCreateAffectedIds(reminder: ReminderInput): string[] {
  return [
    [
      "new",
      reminder.title.toLowerCase(),
      String(reminder.dueAt),
      reminder.notes?.trim().toLowerCase() ?? "",
      reminder.relatedResourceType,
      reminder.relatedResourceId ?? "",
    ].join(":"),
  ];
}

export const proposeReminderCreate = agentMutation({
  args: {
    threadId: v.id("agentThreads"),
    reminder: v.any(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const viewer = ctx.viewerX();
    const reminder = coerce(args.reminder);

    // Ownership on the related resource per spec §5.3. Only creditCard is
    // shipped as a live ownership target at MVP; other resource types skip
    // the cross-table check (handled inline by their owning tools).
    if (
      reminder.relatedResourceType === "creditCard" &&
      reminder.relatedResourceId
    ) {
      const card = await ctx
        .table("creditCards")
        .get(reminder.relatedResourceId as any);
      if (!card || card.userId !== viewer._id) {
        throw new Error("not_authorized");
      }
    }

    return await createProposal(ctx, {
      toolName: TOOL_NAME,
      argsJson: JSON.stringify(reminder),
      summaryText: `Create reminder "${reminder.title}"`,
      affectedCount: 1,
      affectedIds: buildReminderCreateAffectedIds(reminder),
      sampleJson: JSON.stringify(reminder),
      scope: "single",
      threadId: args.threadId,
      awaitingExpiresAt: Date.now() + 5 * 60 * 1000,
    });
  },
});

registerToolExecutor(TOOL_NAME, async (ctx, proposal): Promise<ExecutorResult> => {
  const viewer = ctx.viewerX();
  const parsed = JSON.parse(proposal.argsJson) as ReminderInput;

  const reminderId = (await ctx.table("reminders").insert({
    title: parsed.title,
    dueAt: parsed.dueAt,
    notes: parsed.notes,
    isDone: false,
    relatedResourceType: parsed.relatedResourceType,
    relatedResourceId: parsed.relatedResourceId,
    channels: ["chat"] as Array<"chat" | "email">,
    createdByAgent: true,
    userId: viewer._id,
  } as any)) as string;

  return {
    reversalPayload: { kind: "reminder_dismiss", reminderId },
    affectedIds: [reminderId],
    summary: `Created reminder "${parsed.title}".`,
  };
});

registerReversal(TOOL_NAME, async (ctx, audit) => {
  const viewer = ctx.viewerX();
  const payload = JSON.parse(audit.reversalPayloadJson) as {
    reminderId: string;
  };
  const reminder = await ctx.table("reminders").getX(payload.reminderId as any);
  if (reminder.userId !== viewer._id) throw new Error("not_authorized");
  await reminder.patch({ dismissedAt: Date.now() } as any);
  return { summary: "Dismissed reminder." };
});
