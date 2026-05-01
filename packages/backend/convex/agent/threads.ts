import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../functions";
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
    toolHint: v.optional(v.string()),
  },
  returns: v.object({
    threadId: v.id("agentThreads"),
    messageId: v.id("agentMessages"),
  }),
  handler: async (ctx, { userId, threadId, prompt, toolHint }) => {
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
      toolCallsJson: toolHint ? JSON.stringify({ hint: toolHint }) : undefined,
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
      toolName: v.optional(v.string()),
      toolResultJson: v.optional(v.string()),
      proposalId: v.optional(v.id("agentProposals")),
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
      toolName: step.toolName,
      toolResultJson: step.toolResultJson,
      proposalId: step.proposalId,
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

// Public query consumed by W1 sidebar History and command menu Threads section.
// Viewer-scoped; returns at most `limit` most-recently-touched threads,
// archived excluded.
export const listForUser = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      threadId: v.id("agentThreads"),
      title: v.optional(v.string()),
      summary: v.optional(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, { limit }) => {
    const viewer = ctx.viewerX();
    const cap = Math.min(limit ?? 50, 100);
    const rows = await ctx
      .table("agentThreads", "by_user_lastTurnAt", (q) => q.eq("userId", viewer._id))
      .order("desc");
    return rows
      .filter((t) => !t.isArchived)
      .slice(0, cap)
      .map((t) => ({
        threadId: t._id,
        title: t.title,
        summary: t.summaryText,
        updatedAt: t.lastTurnAt,
      }));
  },
});

// Public mutation: rename a thread. Viewer must own the thread.
export const renameThread = mutation({
  args: {
    threadId: v.id("agentThreads"),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, title }) => {
    const viewer = ctx.viewerX();
    const thread = await ctx.table("agentThreads").getX(threadId);
    if (thread.userId !== viewer._id) throw new Error("Not authorized");
    const trimmed = title.trim().slice(0, 120);
    if (!trimmed) throw new Error("Title cannot be empty");
    await thread.patch({ title: trimmed });
    return null;
  },
});

// Public mutation: soft-delete a thread by setting isArchived.
export const deleteThread = mutation({
  args: {
    threadId: v.id("agentThreads"),
  },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    const viewer = ctx.viewerX();
    const thread = await ctx.table("agentThreads").getX(threadId);
    if (thread.userId !== viewer._id) throw new Error("Not authorized");
    await thread.patch({ isArchived: true });
    return null;
  },
});

/**
 * Public mutation: user-initiated abort of an in-flight agent run.
 *
 * UX-level stop. This codebase doesn't use the `@convex-dev/agent` streaming
 * infrastructure (the runtime calls AI SDK's `streamText` directly inside a
 * scheduled action — see `runtime.ts`), so the agent component's `abortStream`
 * helper has nothing to abort. As a Path-(b) measure per the polish plan
 * Revision 1, this mutation:
 *   1. Flips `isStreaming: false` on any user-turn marker rows for the thread,
 *      so the UI immediately drops the streaming-cursor / shows MessageActions /
 *      derives `isStreaming === false` and swaps stop → send.
 *   2. Inserts a `system`-role tombstone row indicating user-initiated stop,
 *      so the assistant has context about why the run ended on the next turn.
 *
 * The actual `streamText` call in the scheduled action continues to run — a
 * full backend cancellation (a per-run cancel flag table that `onStepFinish`
 * checks and breaks the loop on) is a follow-up sub-issue.
 *
 * Idempotent: safe to call when no run is active (no-ops the patch loop, no
 * extra tombstone row written if the most recent system row already says
 * "stopped").
 */
export const abortRun = mutation({
  args: {
    threadId: v.id("agentThreads"),
  },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    const viewer = ctx.viewerX();
    const thread = await ctx.table("agentThreads").getX(threadId);
    if (thread.userId !== viewer._id) throw new Error("Not authorized");

    const messages = await thread.edge("agentMessages").order("asc");

    let flippedCount = 0;
    for (const msg of messages) {
      if (msg.role === "user" && msg.isStreaming === true) {
        const writable = await ctx.table("agentMessages").getX(msg._id);
        await writable.patch({ isStreaming: false });
        flippedCount += 1;
      }
    }

    // No active streaming-marker rows — nothing to do, stay idempotent.
    if (flippedCount === 0) return null;

    const lastMessage = messages[messages.length - 1];
    const lastIsStopTombstone =
      lastMessage?.role === "system" &&
      typeof lastMessage.text === "string" &&
      lastMessage.text.includes("stopped by user");

    if (!lastIsStopTombstone) {
      await ctx.table("agentMessages").insert({
        agentThreadId: threadId,
        role: "system",
        text: "Run stopped by user.",
        createdAt: Date.now(),
        isStreaming: false,
      });
    }

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
