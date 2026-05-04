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
        cancelledAtTurn: undefined,
      });
    } else {
      const thread = await ctx.table("agentThreads").getX(targetThreadId);
      if (thread.userId !== userId) throw new Error("Not authorized");
      // CROWDEV-342: clear the cancellation flag at the start of each new
      // turn so a stale flag from a prior aborted turn doesn't pre-cancel
      // this one.
      await thread.patch({ lastTurnAt: now, cancelledAtTurn: undefined });
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

// Reduces persisted `agentMessages` rows down to a valid Vercel AI SDK
// `ModelMessage[]` for the next turn's `streamText` call. We must:
//   - Drop `tool` rows. The AI SDK's `ToolModelMessage` schema requires
//     `content: Array<ToolResultPart | ToolApprovalResponse>`; we don't
//     persist `toolCallId` or the structured parts needed to reconstruct
//     them, so emitting `{role: "tool", content: ""}` (the prior behaviour)
//     fails Zod validation in `standardizePrompt` and `streamText` throws
//     `InvalidPromptError` synchronously. The error is swallowed by
//     `runAgentTurn`'s try/catch, no assistant row is persisted, and the
//     user-marker `isStreaming` flag stays true forever — so the UI never
//     receives a reply on turn 2+ after any tool-using turn (CROWDEV-355).
//   - Drop `assistant` rows with empty/undefined text. These are tool-call
//     carrier steps from `onStepFinish`; the model's natural-language
//     summary follows in a later assistant step that already encodes the
//     tool result for the user. Anthropic also rejects empty text blocks.
//   - Drop `system` tombstones (e.g. "Run stopped by user."). The system
//     prompt is rendered fresh per turn from `renderSystemPrompt`; these
//     persisted system rows are a UI artifact, not model input.
//   - Drop `user` rows with empty/undefined text — defensive only.
//
// Future improvement (separate ticket): persist `toolCallId` on tool result
// rows and reconstruct full `ToolCallPart` / `ToolResultPart` content
// arrays so the model sees its raw tool I/O. The natural-language summary
// preserves enough context for follow-ups today.
export const loadForStream = internalQuery({
  args: { threadId: v.id("agentThreads") },
  returns: v.array(v.any()),
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.table("agentThreads").getX(threadId);
    const messages = await thread.edge("agentMessages").order("asc");
    const out: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const m of messages as Array<{ role: string; text?: string }>) {
      if (m.role !== "user" && m.role !== "assistant") continue;
      const text = m.text;
      if (typeof text !== "string" || text.length === 0) continue;
      out.push({ role: m.role, content: text });
    }
    return out;
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
 * Two-pronged stop:
 *   1. UX-effective (CROWDEV-336): flips `isStreaming: false` on user-turn
 *      marker rows so the UI swaps stop → send, and writes a "Run stopped by
 *      user." system tombstone row so the next turn has context.
 *   2. Backend-effective (CROWDEV-342): sets `agentThreads.cancelledAtTurn`
 *      to `Date.now()`. The scheduled `runAgentTurn` action in `runtime.ts`
 *      polls this flag inside its `streamText` drain loop and inside
 *      `onStepFinish`; on detect, it calls `controller.abort()` to halt the
 *      underlying fetch and skips persistence/usage for the cancelled
 *      remainder of the turn.
 *
 * `appendUserTurn` clears `cancelledAtTurn` at the start of each new user
 * turn so a prior abort doesn't pre-cancel a fresh run.
 *
 * Idempotent: safe to call when no run is active (no-ops the patch loop, no
 * extra tombstone row written if the most recent system row already says
 * "stopped"). The flag is set unconditionally — if the runtime isn't
 * currently streaming, it'll be cleared by the next `appendUserTurn`.
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

    // CROWDEV-342: signal the runtime to abort its in-flight `streamText`
    // call. Read by `getCancelFlag`; cleared by `appendUserTurn`.
    await thread.patch({ cancelledAtTurn: Date.now() });

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

/**
 * Internal: light read used by `runAgentTurn`'s drain loop and `onStepFinish`
 * to check whether the user has aborted the current run. Returns the
 * `cancelledAtTurn` epoch-ms or `null`.
 *
 * The runtime captures `turnStartedAt = Date.now()` before invoking
 * `streamText`. A flag value `>= turnStartedAt` means the user clicked stop
 * after this turn began ⇒ the runtime should `controller.abort()` and skip
 * further persistence. A flag value strictly less than `turnStartedAt` is
 * stale (carried over from a prior aborted turn that wasn't followed by a
 * user message — `appendUserTurn` is the canonical clear point, but we still
 * compare timestamps as a defensive belt-and-suspenders check in case a turn
 * is scheduled outside that path).
 */
export const getCancelFlag = internalQuery({
  args: { threadId: v.id("agentThreads") },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.table("agentThreads").get(threadId);
    return thread?.cancelledAtTurn ?? null;
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
