import { v } from "convex/values";
import { internalMutation, internalQuery } from "../functions";
import { computeUsdMicrocents } from "./config";

function firstOfMonthUtc(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

export const checkHeadroom = internalQuery({
  args: {
    userId: v.id("users"),
    threadId: v.optional(v.id("agentThreads")),
  },
  returns: v.object({
    ok: v.boolean(),
    reason: v.optional(
      v.union(v.literal("monthly_cap"), v.literal("thread_cap")),
    ),
  }),
  handler: async (ctx, { userId, threadId }) => {
    const monthly = Number(
      process.env.AGENT_BUDGET_MONTHLY_TOKENS ?? 1_000_000,
    );
    const perThread = Number(
      process.env.AGENT_BUDGET_PER_THREAD_TOKENS ?? 200_000,
    );
    const periodStart = firstOfMonthUtc(Date.now());
    const usageRows = (await ctx.table("agentUsage", "by_user_period", (q) =>
      q.eq("userId", userId).eq("periodStart", periodStart),
    )) as unknown as Array<{ tokensIn: number; tokensOut: number }>;
    const monthlyTotal = usageRows.reduce(
      (acc, r) => acc + r.tokensIn + r.tokensOut,
      0,
    );
    if (monthlyTotal >= monthly) {
      return { ok: false, reason: "monthly_cap" as const };
    }

    if (threadId) {
      const messages = (await ctx.table(
        "agentMessages",
        "by_thread_createdAt",
        (q) => q.eq("agentThreadId", threadId),
      )) as unknown as Array<{ tokensIn?: number; tokensOut?: number }>;
      const threadTotal = messages.reduce(
        (acc, m) => acc + (m.tokensIn ?? 0) + (m.tokensOut ?? 0),
        0,
      );
      if (threadTotal >= perThread) {
        return { ok: false, reason: "thread_cap" as const };
      }
    }

    return { ok: true };
  },
});

export const recordUsage = internalMutation({
  args: {
    userId: v.id("users"),
    modelId: v.string(),
    tokensIn: v.number(),
    tokensOut: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { userId, modelId, tokensIn, tokensOut }) => {
    const periodStart = firstOfMonthUtc(Date.now());
    const rows = await ctx.table("agentUsage", "by_user_period", (q) =>
      q
        .eq("userId", userId)
        .eq("periodStart", periodStart)
        .eq("modelId", modelId),
    );
    const existing = rows[0];
    if (existing) {
      const writable = await ctx.table("agentUsage").getX(existing._id);
      await writable.patch({
        tokensIn: writable.tokensIn + tokensIn,
        tokensOut: writable.tokensOut + tokensOut,
        usdMicrocents:
          writable.usdMicrocents +
          computeUsdMicrocents(modelId, tokensIn, tokensOut),
      });
    } else {
      await ctx.table("agentUsage").insert({
        userId,
        periodStart,
        modelId,
        tokensIn,
        tokensOut,
        usdMicrocents: computeUsdMicrocents(modelId, tokensIn, tokensOut),
        toolCallCount: 0,
      });
    }
    return null;
  },
});
