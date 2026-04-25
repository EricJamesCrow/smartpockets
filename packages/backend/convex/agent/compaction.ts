import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Compact a thread when it grows past a message or input-token threshold.
 * Called from the runtime at the top of each agent turn; no-op if below
 * either threshold. The Haiku summarisation falls back to no-op on error
 * so the agent turn continues.
 */
export const maybeCompact = internalAction({
  args: { threadId: v.id("agentThreads") },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    const messages: Array<{ _id: string }> = await ctx.runQuery(
      (internal as any).agent.threads.listMessagesInternal,
      { threadId },
    );
    const messageThreshold = Number(
      process.env.AGENT_COMPACTION_MESSAGE_THRESHOLD ?? 40,
    );
    const tokenThreshold = Number(
      process.env.AGENT_COMPACTION_INPUT_TOKEN_THRESHOLD ?? 30000,
    );

    const lastUsage: { tokensIn?: number } | null = await ctx.runQuery(
      (internal as any).agent.usage.lastThreadTurn,
      { threadId },
    );

    if (
      messages.length < messageThreshold &&
      (lastUsage?.tokensIn ?? 0) < tokenThreshold
    ) {
      return null;
    }

    const halfIdx = Math.floor(messages.length / 2);
    if (halfIdx < 1) return null;

    const summaryText: string = await ctx.runAction(
      (internal as any).agent.compaction.runClassifierInternal,
      { messages: messages.slice(0, halfIdx) },
    );

    if (summaryText) {
      await ctx.runMutation(
        (internal as any).agent.threads.writeSummary,
        {
          threadId,
          summaryText,
          summaryUpToMessageId: messages[halfIdx - 1]!._id,
        },
      );
    }

    return null;
  },
});

/**
 * Run the classifier (Haiku) to produce the summary text. Isolated as an
 * internalAction so the outer `maybeCompact` can swap models or short-circuit
 * on budget pressure. Falls back to "" on any error (logged).
 */
export const runClassifierInternal = internalAction({
  args: { messages: v.array(v.any()) },
  returns: v.string(),
  handler: async (_ctx, { messages }) => {
    try {
      const { generateText } = await import("ai");
      const { getAnthropicModel, AGENT_CLASSIFIER_MODEL } = await import(
        "./config"
      );
      const modelId =
        process.env.AGENT_MODEL_CLASSIFIER ?? AGENT_CLASSIFIER_MODEL;
      const result = await generateText({
        model: getAnthropicModel(modelId) as any,
        system:
          "Summarise the conversation so far in under 800 tokens. Preserve names, dates, amounts.",
        messages: messages.map((m: { role: string; text?: string }) => ({
          role: m.role,
          content: m.text ?? "",
        })),
      } as any);
      return (result as any).text ?? "";
    } catch (err) {
      console.error("compaction failed", err);
      return "";
    }
  },
});
