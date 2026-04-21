import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../functions";
import { PROMPT_VERSION } from "./system";

// Public query consumed by W1 for the reactive message stream.
export const listMessages = query({
  args: { threadId: v.id("agentThreads") },
  returns: v.array(v.any()),
  handler: async (ctx, { threadId }) => {
    const viewer = ctx.viewerX();
    const thread = await ctx.table("agentThreads").getX(threadId);
    if (thread.userId !== viewer._id) throw new Error("Not authorized");
    return await thread.edge("agentMessages").order("asc");
  },
});

// Internal: called by POST /api/agent/send after Clerk identity verification.
export const appendUserTurn = internalMutation({
  args: {
    userId: v.id("users"),
    threadId: v.optional(v.id("agentThreads")),
    prompt: v.string(),
  },
  returns: v.object({
    threadId: v.id("agentThreads"),
    messageId: v.id("agentMessages"),
  }),
  handler: async (ctx, { userId, threadId, prompt }) => {
    const now = Date.now();
    let targetThreadId = threadId;

    if (!targetThreadId) {
      targetThreadId = await ctx.table("agentThreads").insert({
        userId,
        title: undefined,
        isArchived: false,
        lastTurnAt: now,
        promptVersion: PROMPT_VERSION,
        summaryText: undefined,
        summaryUpToMessageId: undefined,
        componentThreadId: `ct_${Math.random().toString(36).slice(2, 14)}`,
        readCallCount: 0,
      });
    } else {
      const thread = await ctx.table("agentThreads").getX(targetThreadId);
      if (thread.userId !== userId) throw new Error("Not authorized");
      await thread.patch({ lastTurnAt: now });
    }

    const messageId = await ctx.table("agentMessages").insert({
      agentThreadId: targetThreadId,
      role: "user",
      text: prompt,
      createdAt: now,
      isStreaming: true,
    });

    return { threadId: targetThreadId, messageId };
  },
});

// Internal: used by runtime to load the thread snapshot before streaming.
export const getForRun = internalQuery({
  args: { threadId: v.id("agentThreads") },
  returns: v.any(),
  handler: async (ctx, { threadId }) => {
    return await ctx.table("agentThreads").getX(threadId);
  },
});

// Internal: used by runtime's onStepFinish mirror.
export const persistStep = internalMutation({
  args: {
    threadId: v.id("agentThreads"),
    step: v.object({
      role: v.union(
        v.literal("assistant"),
        v.literal("tool"),
        v.literal("system"),
      ),
      text: v.optional(v.string()),
      toolCallsJson: v.optional(v.string()),
      tokensIn: v.optional(v.number()),
      tokensOut: v.optional(v.number()),
      modelId: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, step }) => {
    await ctx.table("agentMessages").insert({
      agentThreadId: threadId,
      role: step.role,
      text: step.text,
      toolCallsJson: step.toolCallsJson,
      tokensIn: step.tokensIn,
      tokensOut: step.tokensOut,
      modelId: step.modelId,
      createdAt: Date.now(),
      isStreaming: false,
    });
    return null;
  },
});

export const loadForStream = internalQuery({
  args: { threadId: v.id("agentThreads") },
  returns: v.array(v.any()),
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.table("agentThreads").getX(threadId);
    const messages = await thread.edge("agentMessages").order("asc");
    return messages.map((m: { role: string; text?: string }) => ({
      role: m.role,
      content: m.text ?? "",
    }));
  },
});

export const listMessagesInternal = internalQuery({
  args: { threadId: v.id("agentThreads") },
  returns: v.array(v.any()),
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.table("agentThreads").getX(threadId);
    return await thread.edge("agentMessages").order("asc");
  },
});

export const bumpReadCallCount = internalMutation({
  args: { threadId: v.id("agentThreads") },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.table("agentThreads").getX(threadId);
    await thread.patch({ readCallCount: thread.readCallCount + 1 });
    return null;
  },
});

export const writeSummary = internalMutation({
  args: {
    threadId: v.id("agentThreads"),
    summaryText: v.string(),
    summaryUpToMessageId: v.id("agentMessages"),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, summaryText, summaryUpToMessageId }) => {
    const thread = await ctx.table("agentThreads").getX(threadId);
    await thread.patch({ summaryText, summaryUpToMessageId });
    return null;
  },
});
