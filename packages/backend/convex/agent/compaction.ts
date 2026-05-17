import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { logAgentRuntimeError } from "./logging";

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
    const snapshot: {
      summaryText?: string;
      messages: Array<{ _id: string; role: string; text?: string }>;
    } = await ctx.runQuery(
      (internal as any).agent.threads.getForCompaction,
      { threadId },
    );
    const { messages } = snapshot;
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
    const toSummarize = messages.slice(0, halfIdx);
    const classifierMessages = snapshot.summaryText
      ? [
          {
            _id: "prior_summary",
            role: "system",
            text: `Previous cumulative summary:\n${snapshot.summaryText}`,
          },
          ...toSummarize,
        ]
      : toSummarize;

    const summaryText: string = await ctx.runAction(
      (internal as any).agent.compaction.runClassifierInternal,
      { threadId, messages: classifierMessages },
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
  args: {
    threadId: v.optional(v.id("agentThreads")),
    messages: v.array(v.any()),
  },
  returns: v.string(),
  handler: async (_ctx, { threadId, messages }) => {
    let modelId = process.env.AGENT_MODEL_CLASSIFIER ?? "claude-haiku-4-5";
    try {
      const { generateText } = await import("ai");
      const { getAnthropicModel, AGENT_CLASSIFIER_MODEL } = await import(
        "./config"
      );
      modelId = process.env.AGENT_MODEL_CLASSIFIER ?? AGENT_CLASSIFIER_MODEL;
      const result = await generateText({
        model: getAnthropicModel(modelId) as any,
        system:
          "Summarise the conversation so far in under 800 tokens. Preserve names, dates, amounts.",
        messages: messages
          .filter((m: { role: string; text?: string }) =>
            (m.role === "user" || m.role === "assistant" || m.role === "system") &&
            typeof m.text === "string" &&
            m.text.length > 0,
          )
          .map((m: { role: string; text?: string }) => ({
            role: m.role,
            content: m.text ?? "",
          })),
      } as any);
      return (result as any).text ?? "";
    } catch (err) {
      logAgentRuntimeError({
        event: "agent_compaction_error",
        phase: "classifier",
        modelId,
        error: err,
        retryable: true,
        correlationParts: [threadId],
      });
      return "";
    }
  },
});
