import {
  paginationOptsValidator,
  paginationResultValidator,
  type PaginationOptions,
} from "convex/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery, mutation, query } from "../functions";
import type { Id } from "../_generated/dataModel";
import { agentLimiter } from "./rateLimits";
import { PROMPT_VERSION } from "./system";

const DEFAULT_ACTIVE_RUN_TTL_MS = 10 * 60 * 1000;
const ACTIVE_RUN_REAP_BATCH_SIZE = 100;
const DEFAULT_CHAT_TURN_RETRY_AFTER_SECONDS = 60;
const MESSAGE_PAGE_SIZE = 50;
const MESSAGE_PAGE_MAX_ROWS_READ = 150;
const MESSAGE_PAGE_MAX_BYTES_READ = 256_000;
const LATEST_MESSAGE_HEAD_LIMIT = 50;
const MODEL_HISTORY_SCAN_LIMIT = 200;
const MODEL_HISTORY_MESSAGE_LIMIT = 80;

const agentMessageDtoValidator = v.object({
  _id: v.id("agentMessages"),
  _creationTime: v.number(),
  agentThreadId: v.id("agentThreads"),
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system"), v.literal("tool")),
  text: v.optional(v.string()),
  toolCallsJson: v.optional(v.string()),
  toolName: v.optional(v.string()),
  toolResultJson: v.optional(v.string()),
  proposalId: v.optional(v.id("agentProposals")),
  tokensIn: v.optional(v.number()),
  tokensOut: v.optional(v.number()),
  modelId: v.optional(v.string()),
  createdAt: v.number(),
  isStreaming: v.boolean(),
});

function boundedMessagePaginationOpts(paginationOpts: PaginationOptions): PaginationOptions {
  const requested = Number.isFinite(paginationOpts.numItems)
    ? Math.floor(paginationOpts.numItems)
    : MESSAGE_PAGE_SIZE;
  const numItems = Math.min(Math.max(1, requested), MESSAGE_PAGE_SIZE);
  return {
    ...paginationOpts,
    numItems,
    maximumRowsRead: Math.min(
      paginationOpts.maximumRowsRead ?? MESSAGE_PAGE_MAX_ROWS_READ,
      MESSAGE_PAGE_MAX_ROWS_READ,
    ),
    maximumBytesRead: Math.min(
      paginationOpts.maximumBytesRead ?? MESSAGE_PAGE_MAX_BYTES_READ,
      MESSAGE_PAGE_MAX_BYTES_READ,
    ),
  };
}

function activeRunTtlMs(): number {
  const configured = Number(process.env.AGENT_ACTIVE_RUN_TTL_MS ?? DEFAULT_ACTIVE_RUN_TTL_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_ACTIVE_RUN_TTL_MS;
}

function retryAfterSeconds(retryAfterMs: number | undefined): number {
  return Math.max(1, Math.ceil((retryAfterMs ?? DEFAULT_CHAT_TURN_RETRY_AFTER_SECONDS * 1000) / 1000));
}

type ThreadWithActiveRun = {
  activeRunUserMessageId?: Id<"agentMessages">;
  activeRunStartedAt?: number;
  activeRunExpiresAt?: number;
};

function activeRunExpiresAt(thread: ThreadWithActiveRun): number | undefined {
  if (typeof thread.activeRunExpiresAt === "number") return thread.activeRunExpiresAt;
  if (typeof thread.activeRunStartedAt === "number") return thread.activeRunStartedAt + activeRunTtlMs();
  return undefined;
}

async function applyChatTurnRateLimit(ctx: any, userId: Id<"users">): Promise<void> {
  try {
    const rl = await (agentLimiter as any).limit(ctx as unknown, "chat_turn", { key: userId });
    if (!rl.ok) {
      throw new Error(`rate_limited:${retryAfterSeconds(rl.retryAfter)}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("rate_limited:")) throw err;
    throw new Error(`rate_limited:${DEFAULT_CHAT_TURN_RETRY_AFTER_SECONDS}`);
  }
}

async function clearExpiredActiveRun(ctx: any, thread: ThreadWithActiveRun & { _id: Id<"agentThreads"> }, now: number): Promise<boolean> {
  if (!thread.activeRunUserMessageId) return false;
  const expiresAt = activeRunExpiresAt(thread);
  if (typeof expiresAt === "number" && expiresAt > now) {
    throw new Error("run_in_progress");
  }
  const writable = await ctx.table("agentThreads").getX(thread._id);
  await writable.patch({
    activeRunUserMessageId: undefined,
    activeRunStartedAt: undefined,
    activeRunExpiresAt: undefined,
  });
  return true;
}

async function startUserTurn(
  ctx: any,
  args: {
    userId: Id<"users">;
    threadId?: Id<"agentThreads">;
    prompt: string;
    toolHint?: string;
  },
): Promise<{ threadId: Id<"agentThreads">; messageId: Id<"agentMessages"> }> {
  const now = Date.now();
  const expiresAt = now + activeRunTtlMs();
  let targetThreadId = args.threadId;

  if (targetThreadId) {
    const thread = await ctx.table("agentThreads").getX(targetThreadId);
    if (thread.userId !== args.userId) throw new Error("Not authorized");
    await clearExpiredActiveRun(ctx, thread, now);
  }

  await applyChatTurnRateLimit(ctx, args.userId);

  if (!targetThreadId) {
    targetThreadId = await ctx.table("agentThreads").insert({
      userId: args.userId,
      title: undefined,
      isArchived: false,
      lastTurnAt: now,
      promptVersion: PROMPT_VERSION,
      summaryText: undefined,
      summaryUpToMessageId: undefined,
      componentThreadId: `ct_${Math.random().toString(36).slice(2, 14)}`,
      readCallCount: 0,
      cancelledAtTurn: undefined,
      activeRunUserMessageId: undefined,
      activeRunStartedAt: undefined,
      activeRunExpiresAt: undefined,
    });
  }
  const finalThreadId = targetThreadId as Id<"agentThreads">;

  const messageId = await ctx.table("agentMessages").insert({
    agentThreadId: finalThreadId,
    role: "user",
    text: args.prompt,
    toolCallsJson: args.toolHint ? JSON.stringify({ hint: args.toolHint }) : undefined,
    createdAt: now,
    isStreaming: true,
  });

  const thread = await ctx.table("agentThreads").getX(finalThreadId);
  await thread.patch({
    lastTurnAt: now,
    cancelledAtTurn: undefined,
    activeRunUserMessageId: messageId,
    activeRunStartedAt: now,
    activeRunExpiresAt: expiresAt,
  });

  return { threadId: finalThreadId, messageId };
}

async function getOwnedThread(ctx: any, threadId: Id<"agentThreads">) {
  const viewer = ctx.viewerX();
  const thread = await ctx.table("agentThreads").getX(threadId);
  if (thread.userId !== viewer._id) throw new Error("Not authorized");
  return thread;
}

// Public reactive head query for the newest/streaming rows. The paginated
// history query below loads older pages; this bounded head stays subscribed so
// newly inserted or patched rows surface without relying on page revalidation.
export const listLatestMessages = query({
  args: {
    threadId: v.id("agentThreads"),
    limit: v.optional(v.number()),
  },
  returns: v.array(agentMessageDtoValidator),
  handler: async (ctx, { threadId, limit }) => {
    await getOwnedThread(ctx, threadId);
    const requested = typeof limit === "number" && Number.isFinite(limit) ? Math.floor(limit) : LATEST_MESSAGE_HEAD_LIMIT;
    const cap = Math.min(Math.max(1, requested), LATEST_MESSAGE_HEAD_LIMIT);
    const rows = await ctx
      .table("agentMessages", "by_thread_createdAt", (q) => q.eq("agentThreadId", threadId))
      .order("desc")
      .take(cap);
    return rows.reverse();
  },
});

export const listMessagesPage = query({
  args: {
    threadId: v.id("agentThreads"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(agentMessageDtoValidator),
  handler: async (ctx, { threadId, paginationOpts }) => {
    await getOwnedThread(ctx, threadId);
    return await ctx
      .table("agentMessages", "by_thread_createdAt", (q) => q.eq("agentThreadId", threadId))
      .order("desc")
      .paginate(boundedMessagePaginationOpts(paginationOpts));
  },
});

// Backward-compatible bounded head query for older callers/tests.
export const listMessages = query({
  args: { threadId: v.id("agentThreads") },
  returns: v.array(agentMessageDtoValidator),
  handler: async (ctx, { threadId }) => {
    await getOwnedThread(ctx, threadId);
    const rows = await ctx
      .table("agentMessages", "by_thread_createdAt", (q) => q.eq("agentThreadId", threadId))
      .order("desc")
      .take(LATEST_MESSAGE_HEAD_LIMIT);
    return rows.reverse();
  },
});

export const getRunState = query({
  args: { threadId: v.id("agentThreads") },
  returns: v.object({
    activeRunUserMessageId: v.optional(v.id("agentMessages")),
    activeRunStartedAt: v.optional(v.number()),
    activeRunExpiresAt: v.optional(v.number()),
  }),
  handler: async (ctx, { threadId }) => {
    const viewer = ctx.viewerX();
    const thread = await ctx.table("agentThreads").getX(threadId);
    if (thread.userId !== viewer._id) throw new Error("Not authorized");
    return {
      activeRunUserMessageId: thread.activeRunUserMessageId,
      activeRunStartedAt: thread.activeRunStartedAt,
      activeRunExpiresAt: thread.activeRunExpiresAt,
    };
  },
});

// Internal: called by POST /api/agent/send after Clerk identity verification.
export const startUserTurnInternal = internalMutation({
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
  handler: async (ctx, args) => startUserTurn(ctx, args),
});

// Backward-compatible internal alias for older callers/tests.
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
  handler: async (ctx, args) => startUserTurn(ctx, args),
});

/**
 * CROWDEV-395: edit-and-resend on a user message.
 *
 * Hard re-send semantics (NOT branching/forking):
 *   1. Verify the viewer owns the thread AND the target message is a user row.
 *   2. Delete every message in the thread with `createdAt > target.createdAt`
 *      (assistant text, tool calls, tool results from the original turn —
 *      and any later turns layered on top of it).
 *   3. Patch the target row's `text` to the new prompt and flip `isStreaming`
 *      back to `true`. This matches `appendUserTurn`'s convention so the chat
 *      UI's "is the run in flight?" derivation
 *      (`lastUser.isStreaming === true && noAssistantRowAfter`) kicks in
 *      automatically — same aria-busy, same typing-indicator, same stop button.
 *   4. Patch the thread: bump `lastTurnAt` (sidebar ordering) and clear
 *      `cancelledAtTurn` so a stale flag from a prior aborted turn doesn't
 *      pre-cancel this fresh run.
 *   5. Schedule `runAgentTurn` directly. The runtime's `loadForStream` reads
 *      `agentMessages` rows live, so the truncated history is what reaches
 *      `streamText`. The `componentThreadId` field on `agentThreads` is just
 *      an opaque identifier — the agent has no separate component-side
 *      message log to truncate, so deleting Convex rows is sufficient.
 *
 * Budget headroom is checked inline (same as `appendUserTurn`'s HTTP entry
 * point in `http.ts`); on cap the mutation throws so the frontend can route
 * the error through `TypedAgentError`.
 */
export const editAndResendUserTurn = mutation({
  args: {
    messageId: v.id("agentMessages"),
    newText: v.string(),
  },
  returns: v.object({
    threadId: v.id("agentThreads"),
    messageId: v.id("agentMessages"),
  }),
  handler: async (ctx, { messageId, newText }) => {
    const trimmed = newText.trim();
    if (!trimmed) throw new Error("Message cannot be empty");
    if (trimmed.length > 8192) throw new Error("Message too long");

    const viewer = ctx.viewerX();
    const target = await ctx.table("agentMessages").getX(messageId);
    if (target.role !== "user") {
      throw new Error("Only user messages can be edited");
    }

    const thread = await ctx.table("agentThreads").getX(target.agentThreadId);
    if (thread.userId !== viewer._id) throw new Error("Not authorized");
    await clearExpiredActiveRun(ctx, thread, Date.now());
    const summaryPatch: {
      summaryText?: undefined;
      summaryUpToMessageId?: undefined;
    } = {};
    if (thread.summaryUpToMessageId) {
      const summaryMarker = await ctx.table("agentMessages").get(thread.summaryUpToMessageId);
      const markerSort = [
        summaryMarker?.createdAt ?? Number.POSITIVE_INFINITY,
        summaryMarker?._creationTime ?? Number.POSITIVE_INFINITY,
      ] as const;
      const targetSort = [target.createdAt, target._creationTime] as const;
      const summaryIncludesTarget =
        markerSort[0] > targetSort[0] ||
        (markerSort[0] === targetSort[0] && markerSort[1] >= targetSort[1]);
      if (!summaryMarker || summaryMarker.agentThreadId !== thread._id || summaryIncludesTarget) {
        summaryPatch.summaryText = undefined;
        summaryPatch.summaryUpToMessageId = undefined;
      }
    }

    const budget = await ctx.runQuery(internal.agent.budgets.checkHeadroom, {
      userId: viewer._id,
      threadId: thread._id,
    });
    if (!budget.ok) {
      throw new Error(`budget_exhausted:${budget.reason ?? "unknown"}`);
    }
    await applyChatTurnRateLimit(ctx, viewer._id);

    // Truncate every message strictly after the target. Range query on
    // `by_thread_createdAt` gives us only the rows we need, and matches the
    // sort order the chat UI renders in. Matching `createdAt > target` (not
    // `>=`) preserves the target row itself — we patch it below.
    const downstream = await ctx
      .table("agentMessages", "by_thread_createdAt", (q) =>
        q.eq("agentThreadId", thread._id).gt("createdAt", target.createdAt),
      );
    for (const msg of downstream) {
      const writable = await ctx.table("agentMessages").getX(msg._id);
      await writable.delete();
    }

    const writableTarget = await ctx.table("agentMessages").getX(messageId);
    await writableTarget.patch({
      text: trimmed,
      // Clear any stale tool hint or tool-call breadcrumb on the original
      // row; this is a fresh prompt, not a replay of the prior toolHint.
      toolCallsJson: undefined,
      isStreaming: true,
    });

    const now = Date.now();
    await thread.patch({
      lastTurnAt: now,
      cancelledAtTurn: undefined,
      activeRunUserMessageId: messageId,
      activeRunStartedAt: now,
      activeRunExpiresAt: now + activeRunTtlMs(),
      ...summaryPatch,
    });

    // CROWDEV-343: capture schedule timestamp BEFORE `runAfter` so the
    // runtime's cancel-flag comparison covers any Stop click that lands
    // between schedule and action-start.
    const turnScheduledAt = Date.now();
    await ctx.scheduler.runAfter(0, internal.agent.runtime.runAgentTurn, {
      userId: viewer._id,
      threadId: thread._id,
      userMessageId: messageId,
      turnScheduledAt,
    });

    return { threadId: thread._id, messageId };
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

export const getRunBootstrap = internalQuery({
  args: {
    threadId: v.id("agentThreads"),
    userMessageId: v.id("agentMessages"),
  },
  returns: v.object({
    latestUserMessage: v.union(
      v.object({
        _id: v.id("agentMessages"),
        text: v.optional(v.string()),
        toolCallsJson: v.optional(v.string()),
      }),
      v.null(),
    ),
    isFirstTurn: v.boolean(),
  }),
  handler: async (ctx, { threadId, userMessageId }) => {
    const userMessage = await ctx.table("agentMessages").get(userMessageId);
    const latestUserMessage =
      userMessage?.agentThreadId === threadId && userMessage.role === "user"
        ? {
            _id: userMessage._id,
            text: userMessage.text,
            toolCallsJson: userMessage.toolCallsJson,
          }
        : null;
    const firstMessages = await ctx
      .table("agentMessages", "by_thread_createdAt", (q) => q.eq("agentThreadId", threadId))
      .order("asc")
      .take(2);
    return {
      latestUserMessage,
      isFirstTurn: firstMessages.length === 1 && firstMessages[0]?._id === userMessageId,
    };
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

/**
 * CROWDEV-409: incremental-streaming assistant write path.
 *
 * Background: previously the runtime only persisted assistant text in
 * `onStepFinish` — after the full step completed — by inserting a NEW row
 * with `isStreaming: false` and the full step text. The chat UI's
 * `useSmoothText` hook in `MessageBubble.tsx` only smooths text when the
 * bubble is mounted with `startStreaming: true` (i.e. `message.isStreaming`
 * is true at mount). Because the real assistant row arrived already-complete
 * and with `isStreaming: false`, the bubble mounted with full text and never
 * smoothed — the assistant message rendered all at once, defeating the whole
 * point of streaming.
 *
 * Fix: split assistant text persistence into three lifecycle stages —
 *   1. `insertStreamingAssistantRow` — inserts an empty placeholder row with
 *      `isStreaming: true` on the FIRST text chunk of a step. The UI starts
 *      smoothing immediately.
 *   2. `patchStreamingAssistantText` — patches the accumulated text. The
 *      runtime throttles this to ~80ms to keep DB writes bounded.
 *   3. `finalizeStreamingAssistantRow` — flips `isStreaming: false` and
 *      records usage at step end. The runtime calls this from `onStepFinish`
 *      with the canonical step text (defense against drift between chunks
 *      and step.text).
 *
 * Tool-only steps (no text) never insert a streaming row — only `persistStep`
 * with `toolResultJson` rows are written. Multi-step turns that interleave
 * text + tool calls get one streaming row per text-bearing step.
 *
 * Cancellation: if the runtime is aborted mid-stream, the streaming row is
 * left with `isStreaming: true` and partial text. The `finally` block in
 * `runAgentTurn` calls `finalizeStrandedStreamingAssistantRow` to flip the
 * flag (the partial text is preserved so the user can read what arrived
 * before they hit stop).
 */
export const insertStreamingAssistantRow = internalMutation({
  args: {
    threadId: v.id("agentThreads"),
    modelId: v.optional(v.string()),
  },
  returns: v.id("agentMessages"),
  handler: async (ctx, { threadId, modelId }) => {
    return await ctx.table("agentMessages").insert({
      agentThreadId: threadId,
      role: "assistant",
      text: "",
      modelId,
      createdAt: Date.now(),
      isStreaming: true,
    });
  },
});

export const patchStreamingAssistantText = internalMutation({
  args: {
    messageId: v.id("agentMessages"),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { messageId, text }) => {
    const writable = await ctx.table("agentMessages").getX(messageId);
    await writable.patch({ text });
    return null;
  },
});

export const finalizeStreamingAssistantRow = internalMutation({
  args: {
    messageId: v.id("agentMessages"),
    text: v.string(),
    toolCallsJson: v.optional(v.string()),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
    modelId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { messageId, text, toolCallsJson, tokensIn, tokensOut, modelId }) => {
    const writable = await ctx.table("agentMessages").getX(messageId);
    await writable.patch({
      text,
      toolCallsJson,
      tokensIn,
      tokensOut,
      modelId,
      isStreaming: false,
    });
    return null;
  },
});

/**
 * CROWDEV-409: clean up an assistant streaming row that the runtime never
 * finalized — typically because `streamText` errored or was aborted before
 * `onStepFinish` fired. Flips `isStreaming: false` so the chat UI stops
 * treating the row as in-flight; preserves whatever partial `text` arrived
 * so the user can read what they got.
 *
 * Idempotent. No-ops if the row is missing or already finalized.
 */
export const finalizeStrandedStreamingAssistantRow = internalMutation({
  args: { messageId: v.id("agentMessages") },
  returns: v.null(),
  handler: async (ctx, { messageId }) => {
    const target = await ctx.table("agentMessages").get(messageId);
    if (!target) return null;
    if (target.isStreaming !== true) return null;
    const writable = await ctx.table("agentMessages").getX(messageId);
    await writable.patch({ isStreaming: false });
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
//   - Drop `assistant` rows with `isStreaming: true` — defensive only
//     (CROWDEV-409). The runtime's incremental-streaming writes flip the
//     flag back to false at step-end via `finalizeStreamingAssistantRow`
//     (or via the `finally` block's stranded-row cleanup). A row stuck at
//     `isStreaming: true` here means the prior turn errored mid-stream and
//     the cleanup didn't run — feeding the partial text to the next turn
//     would surface ambiguous half-written content to the model.
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
    let summaryText: string | undefined;
    let summaryMarkerCreatedAt: number | undefined;
    if (thread.summaryText && thread.summaryUpToMessageId) {
      const summaryMarker = await ctx.table("agentMessages").get(thread.summaryUpToMessageId);
      if (summaryMarker?.agentThreadId === threadId) {
        summaryText = thread.summaryText;
        summaryMarkerCreatedAt = summaryMarker.createdAt;
      }
    }
    const messages = (
      summaryMarkerCreatedAt === undefined
        ? await ctx
            .table("agentMessages", "by_thread_createdAt", (q) => q.eq("agentThreadId", threadId))
            .order("desc")
            .take(MODEL_HISTORY_SCAN_LIMIT)
        : await ctx
            .table("agentMessages", "by_thread_createdAt", (q) =>
              q.eq("agentThreadId", threadId).gt("createdAt", summaryMarkerCreatedAt),
            )
            .order("desc")
            .take(MODEL_HISTORY_SCAN_LIMIT)
    ).reverse();
    const out: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
    for (const m of messages as Array<{ role: string; text?: string; isStreaming?: boolean }>) {
      if (m.role !== "user" && m.role !== "assistant") continue;
      if (m.role === "assistant" && m.isStreaming === true) continue;
      const text = m.text;
      if (typeof text !== "string" || text.length === 0) continue;
      out.push({ role: m.role, content: text });
    }
    const tail = out.slice(-MODEL_HISTORY_MESSAGE_LIMIT);
    if (!summaryText) return tail;
    return [
      {
        role: "system",
        content: `Earlier conversation summary:\n${summaryText}`,
      },
      ...tail,
    ];
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

export const getForCompaction = internalQuery({
  args: { threadId: v.id("agentThreads") },
  returns: v.object({
    summaryText: v.optional(v.string()),
    messages: v.array(agentMessageDtoValidator),
  }),
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.table("agentThreads").getX(threadId);
    if (thread.summaryText && thread.summaryUpToMessageId) {
      const summaryMarker = await ctx.table("agentMessages").get(thread.summaryUpToMessageId);
      if (summaryMarker?.agentThreadId === threadId) {
        const tail = await ctx
          .table("agentMessages", "by_thread_createdAt", (q) =>
            q.eq("agentThreadId", threadId).gt("createdAt", summaryMarker.createdAt),
          )
          .order("asc");
        return {
          summaryText: thread.summaryText,
          messages: tail,
        };
      }
    }

    const messages = await ctx
      .table("agentMessages", "by_thread_createdAt", (q) => q.eq("agentThreadId", threadId))
      .order("asc");
    return { messages };
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

export const finishActiveRun = internalMutation({
  args: {
    threadId: v.id("agentThreads"),
    userMessageId: v.id("agentMessages"),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, userMessageId }) => {
    const thread = await ctx.table("agentThreads").get(threadId);
    if (!thread) return null;
    if (thread.activeRunUserMessageId !== userMessageId) return null;
    const writable = await ctx.table("agentThreads").getX(threadId);
    await writable.patch({
      activeRunUserMessageId: undefined,
      activeRunStartedAt: undefined,
      activeRunExpiresAt: undefined,
    });
    return null;
  },
});

export const reapExpiredActiveRunsInternal = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx
      .table("agentThreads", "by_activeRunExpiresAt", (q) => q.lt("activeRunExpiresAt", now))
      .take(ACTIVE_RUN_REAP_BATCH_SIZE);
    let count = 0;
    for (const thread of expired) {
      if (!thread.activeRunUserMessageId) continue;
      const writable = await ctx.table("agentThreads").getX(thread._id);
      await writable.patch({
        activeRunUserMessageId: undefined,
        activeRunStartedAt: undefined,
        activeRunExpiresAt: undefined,
      });
      count += 1;
    }
    return count;
  },
});

/**
 * CROWDEV-367: defensive cleanup called from `runAgentTurn`'s `finally`.
 *
 * The user-turn marker row is inserted with `isStreaming: true`. The chat UI
 * derives "is the run in flight?" from
 * `lastUser.isStreaming === true && noAssistantRowAfter`. Three terminal
 * paths exist:
 *
 *   1. Successful completion — assistant row(s) land via `persistStep`. The
 *      user row's flag stays true, but `noAssistantRowAfter` is false, so
 *      the UI shows the run as complete. No-op for this mutation.
 *   2. User-initiated abort — `abortRun` flips the flag to false AND writes
 *      a system tombstone. This mutation finds the flag already false and
 *      no-ops.
 *   3. Runtime error mid-turn — provider 5xx, network failure, Zod
 *      validation in `loadForStream` → `standardizePrompt`, invalid model
 *      id, etc. No assistant row lands. The user row's flag stays true and
 *      `noAssistantRowAfter` stays true, sticking the typing indicator and
 *      stop button in the UI forever (and the next `appendUserTurn` only
 *      clears `cancelledAtTurn`, not the prior user row's flag). **This
 *      mutation flips the flag in that case.**
 *
 * Idempotent. Empty thread, missing user row, or already-false flag all
 * no-op. Safe to call from anywhere; the runtime calls it from `finally`
 * regardless of how the turn ended.
 */
export const finalizeUserTurnIfStranded = internalMutation({
  args: { threadId: v.id("agentThreads") },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.table("agentThreads").get(threadId);
    if (!thread) return null;
    const messages = await thread.edge("agentMessages").order("asc");
    if (messages.length === 0) return null;

    // Find the most-recent user row.
    let lastUser:
      | { _id: import("../_generated/dataModel").Id<"agentMessages">; _creationTime: number; isStreaming?: boolean }
      | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m && m.role === "user") {
        lastUser = m as typeof lastUser;
        break;
      }
    }
    if (!lastUser) return null;
    if (lastUser.isStreaming !== true) return null;

    // Any assistant row created strictly after the user row means a reply
    // landed and the run completed; don't touch the flag in that case.
    const userCreationTime = lastUser._creationTime;
    const hasAssistantAfter = messages.some(
      (m) => m.role === "assistant" && (m._creationTime ?? 0) > userCreationTime,
    );
    if (hasAssistantAfter) return null;

    const writable = await ctx.table("agentMessages").getX(lastUser._id);
    await writable.patch({ isStreaming: false });
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

// CROWDEV-353: dev/test-only seed helpers used by Playwright e2e (`apps/app/tests/`).
//
// Both mutations refuse to run on a production Convex deployment by checking
// `CONVEX_CLOUD_URL` (a built-in env var Convex sets to the deployment URL).
// Production deployments use `https://*.convex.cloud` with a deployment name
// matching `prod:*` — the gating value here is `process.env.CONVEX_DEPLOYMENT`,
// which Convex injects into both dev and prod runtimes; on dev deployments it
// looks like `dev:foo-123`, on prod it's `prod:smartpockets`.
//
// We do NOT use `viewer.email` allow-listing because the `users` ent here uses
// a Clerk `externalId` mapping with no email field on the row itself. The
// owner/sole-tester model is sufficient for the gating goal.
function assertNotProduction(): void {
  const deployment = process.env.CONVEX_DEPLOYMENT ?? "";
  if (deployment.startsWith("prod:")) {
    throw new Error(
      "createTestThread/deleteAllTestThreads must never run on a production deployment. " +
        `CONVEX_DEPLOYMENT=${deployment}`,
    );
  }
}

/**
 * Creates a thread for the signed-in viewer with the given title. Used by
 * Playwright e2e specs to seed deterministic sidebar state without driving
 * the full chat-send flow (which requires the LLM provider and is slow + flaky).
 *
 * Gated to non-production deployments. Viewer-scoped; safe to call repeatedly.
 */
export const createTestThread = mutation({
  args: { title: v.string() },
  returns: v.id("agentThreads"),
  handler: async (ctx, { title }) => {
    assertNotProduction();
    const viewer = ctx.viewerX();
    const now = Date.now();
    const trimmed = title.trim().slice(0, 120) || "Test thread";
    return await ctx.table("agentThreads").insert({
      userId: viewer._id,
      title: trimmed,
      isArchived: false,
      lastTurnAt: now,
      promptVersion: PROMPT_VERSION,
      summaryText: undefined,
      summaryUpToMessageId: undefined,
      componentThreadId: `ct_test_${Math.random().toString(36).slice(2, 14)}`,
      readCallCount: 0,
      cancelledAtTurn: undefined,
      activeRunUserMessageId: undefined,
      activeRunStartedAt: undefined,
      activeRunExpiresAt: undefined,
    });
  },
});

/**
 * Hard-deletes all of the signed-in viewer's threads + their child messages.
 * Used by Playwright `beforeEach` to reset state between specs so the kebab
 * spec sees exactly the threads it seeded — not leftovers from a previous run.
 *
 * Note: production sidebar uses soft-delete (`isArchived: true`) via
 * `deleteThread`. This helper hard-deletes because soft-deleted rows still
 * sit in the table and will count toward the user's thread budget over time.
 *
 * Gated to non-production deployments. Viewer-scoped.
 */
export const deleteAllTestThreads = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    assertNotProduction();
    const viewer = ctx.viewerX();
    const threads = await ctx
      .table("agentThreads", "by_user_lastTurnAt", (q) => q.eq("userId", viewer._id));
    let count = 0;
    for (const thread of threads) {
      const messages = await thread.edge("agentMessages");
      for (const msg of messages) {
        await ctx.table("agentMessages").getX(msg._id).then((m) => m.delete());
      }
      await thread.delete();
      count += 1;
    }
    return count;
  },
});
