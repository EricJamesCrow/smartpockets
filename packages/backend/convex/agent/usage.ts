import { v } from "convex/values";
import { internalQuery } from "../functions";

/**
 * Aggregate agentUsage rows across all users, scoped to a period start window.
 * Admin-facing only at MVP (no public query); a future /admin/agent-usage page
 * will subscribe.
 */
export const summariseByUser = internalQuery({
  args: { periodStart: v.number() },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      tokensIn: v.number(),
      tokensOut: v.number(),
      usdMicrocents: v.number(),
      toolCallCount: v.number(),
      threadCount: v.number(),
    }),
  ),
  handler: async (ctx, { periodStart }) => {
    const allUsage = (await ctx.table("agentUsage")) as unknown as Array<{
      userId: string;
      periodStart: number;
      tokensIn: number;
      tokensOut: number;
      usdMicrocents: number;
      toolCallCount: number;
    }>;
    const rows = allUsage.filter((r) => r.periodStart >= periodStart);
    const byUser = new Map<
      string,
      {
        tokensIn: number;
        tokensOut: number;
        usdMicrocents: number;
        toolCallCount: number;
      }
    >();
    for (const r of rows) {
      const acc = byUser.get(r.userId) ?? {
        tokensIn: 0,
        tokensOut: 0,
        usdMicrocents: 0,
        toolCallCount: 0,
      };
      acc.tokensIn += r.tokensIn;
      acc.tokensOut += r.tokensOut;
      acc.usdMicrocents += r.usdMicrocents;
      acc.toolCallCount += r.toolCallCount;
      byUser.set(r.userId, acc);
    }

    const result: Array<{
      userId: string;
      tokensIn: number;
      tokensOut: number;
      usdMicrocents: number;
      toolCallCount: number;
      threadCount: number;
    }> = [];
    for (const [userId, acc] of byUser) {
      const threads = await ctx.table(
        "agentThreads",
        "by_user_lastTurnAt",
        (q) => q.eq("userId", userId as never),
      );
      result.push({
        userId,
        ...acc,
        threadCount: threads.length,
      });
    }
    return result as never;
  },
});

/**
 * Return the last assistant message's tokensIn for a thread. Used by the
 * compaction heuristic: if the last run's prompt-tokens crossed the threshold,
 * compact before the next turn.
 */
export const lastThreadTurn = internalQuery({
  args: { threadId: v.id("agentThreads") },
  returns: v.union(v.object({ tokensIn: v.number() }), v.null()),
  handler: async (ctx, { threadId }) => {
    const messages = (await ctx.table(
      "agentMessages",
      "by_thread_createdAt",
      (q) => q.eq("agentThreadId", threadId),
    )) as unknown as Array<{
      role: string;
      tokensIn?: number;
    }>;
    const reversed = [...messages].reverse();
    const last = reversed.find(
      (m) => m.role === "assistant" && m.tokensIn !== undefined,
    );
    return last ? { tokensIn: last.tokensIn ?? 0 } : null;
  },
});
