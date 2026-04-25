import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { AGENT_TOOLS } from "./registry";
import { PROMPT_VERSION, renderSystemPrompt } from "./system";
import { AGENT_DEFAULT_MODEL, getAnthropicModel } from "./config";
import { agentLimiter } from "./rateLimits";

const agent = internal.agent;

type ToolEnvelope =
  | { ok: true; data?: unknown; meta?: unknown }
  | { ok: false; error?: { code?: unknown; message?: unknown; retryable?: unknown } };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeToolResult(raw: unknown): {
  payload: unknown;
  proposalId?: Id<"agentProposals">;
} {
  let payload = raw;

  if (isRecord(raw) && "ok" in raw) {
    const envelope = raw as ToolEnvelope;
    if (envelope.ok === true) {
      payload = envelope.data ?? null;
    } else {
      const err = envelope.error ?? {};
      payload = {
        error:
          typeof err.message === "string"
            ? err.message
            : typeof err.code === "string"
              ? err.code
              : "tool_failed",
        code: typeof err.code === "string" ? err.code : "tool_failed",
        retryable: typeof err.retryable === "boolean" ? err.retryable : false,
      };
    }
  }

  const proposalId =
    isRecord(payload) && typeof payload.proposalId === "string"
      ? (payload.proposalId as Id<"agentProposals">)
      : undefined;

  return { payload, proposalId };
}

/**
 * Build per-turn tool closures that inject trusted `userId` + `threadId`
 * before dispatching to each registered handler. Wraps:
 *   1. Rate limit
 *   2. First-turn guard (propose tools only)
 *   3. Handler dispatch (internal query or mutation)
 *   4. Read-count bump (read tools only)
 *   5. Output-cap truncation
 *   6. Error envelope
 */
function buildToolsForAgent({
  ctx,
  userId,
  threadId,
}: {
  ctx: ActionCtx;
  userId: Id<"users">;
  threadId: Id<"agentThreads">;
}) {
  const out: Record<string, unknown> = {};

  for (const [toolName, def] of Object.entries(AGENT_TOOLS)) {
    // Late-resolve via require-at-use to keep Vercel AI SDK version boundaries
    // loose; @convex-dev/agent forwards the tool() factory from `ai`.
    const { tool } = require("ai");
    out[toolName] = tool({
      description: def.description,
      inputSchema: def.llmInputSchema,
      execute: async (args: Record<string, unknown>) => {
        try {
          const rl = await (agentLimiter as any).limit(
            ctx as unknown,
            def.bucket,
            { key: userId },
          );
          if (!rl.ok) {
            return {
              ok: false as const,
              error: {
                code: "rate_limited" as const,
                message: `Rate limit reached; retry in ${rl.retryAfter ?? 60}s.`,
                retryable: true,
              },
            };
          }
        } catch (err) {
          console.warn(`[agent.runtime] rate-limit check failed for ${toolName}:`, err);
        }

        if (def.firstTurnGuard) {
          const guard: { ok: boolean; reason: string } = await ctx.runQuery(
            agent.proposals.checkFirstTurnGuard,
            { threadId },
          );
          if (!guard.ok) {
            return {
              ok: false as const,
              error: {
                code: "first_turn_guard" as const,
                message: guard.reason,
                retryable: false,
              },
            };
          }
        }

        try {
          const dispatchArgs = { userId, threadId, ...args };
          const result =
            def.handlerType === "mutation"
              ? await ctx.runMutation(def.handler as any, dispatchArgs)
              : await ctx.runQuery(def.handler as any, {
                  userId,
                  ...args,
                });

          if (def.incrementsReadCount) {
            await ctx.runMutation(agent.threads.bumpReadCallCount, { threadId });
          }

          const serialized = JSON.stringify(result);
          const cap = Number(
            process.env.AGENT_BUDGET_PER_TOOLCALL_TOKENS ?? 15000,
          );
          if (serialized.length / 4 > cap) {
            return {
              ok: true as const,
              data: { ...result, __truncated: true },
              meta: { rowsRead: -1, durationMs: 0, truncated: true },
            };
          }

          return {
            ok: true as const,
            data: result,
            meta: { rowsRead: -1, durationMs: 0 },
          };
        } catch (err) {
          console.error(`[agent.runtime] tool ${toolName} failed:`, err);
          return {
            ok: false as const,
            error: {
              code: "downstream_failed" as const,
              message: String(err),
              retryable: true,
            },
          };
        }
      },
    });
  }

  return out;
}

/**
 * Scheduled agent turn. Opens the thread, loads context, calls `streamText`
 * with the tool set, mirrors each step to `agentMessages`, accrues
 * `agentUsage`, and evaluates compaction post-run.
 */
export const runAgentTurn = internalAction({
  args: {
    userId: v.id("users"),
    threadId: v.id("agentThreads"),
    userMessageId: v.id("agentMessages"),
  },
  returns: v.null(),
  handler: async (ctx, { userId, threadId, userMessageId }) => {
    const thread: { promptVersion?: string } = await ctx.runQuery(
      agent.threads.getForRun,
      { threadId },
    );
    const context: string = await ctx.runQuery(agent.context.compose, {
      userId,
      threadId,
    });
    const tools = buildToolsForAgent({ ctx, userId, threadId });
    const modelId =
      process.env.AGENT_MODEL_DEFAULT ?? AGENT_DEFAULT_MODEL;

    // M12: deterministic tool-hint path. The last user message may carry a
    // `toolCallsJson` with `{ tool, args }`; surface it to the model as a
    // directive so it calls that tool directly instead of re-deliberating.
    let toolHintDirective = "";
    try {
      const msgs = await ctx.runQuery(agent.threads.listMessagesInternal, {
        threadId,
      });
      const user = (msgs as Array<{ _id: string; role: string; toolCallsJson?: string }>)
        .find((m) => m._id === (userMessageId as unknown as string));
      if (user?.toolCallsJson) {
        const parsed = JSON.parse(user.toolCallsJson) as {
          tool?: string;
          args?: Record<string, unknown>;
        };
        if (parsed.tool) {
          toolHintDirective =
            `\n\nThe user hinted at tool \`${parsed.tool}\` with args ` +
            `\`${JSON.stringify(parsed.args ?? {})}\`. ` +
            "Prefer calling this tool directly unless the context makes it infeasible.";
        }
      }
    } catch (err) {
      console.warn("[agent.runtime] toolHint parse failed:", err);
    }

    try {
      const { streamText } = await import("ai");
      const messages: Array<{ role: string; content: string }> =
        await ctx.runQuery(agent.threads.loadForStream, { threadId });

      const { stepCountIs } = await import("ai");
      const result = streamText({
        model: getAnthropicModel(modelId) as any,
        system: renderSystemPrompt({
          promptVersion: thread.promptVersion ?? PROMPT_VERSION,
          context,
        }) + toolHintDirective,
        messages: messages as any,
        tools: tools as any,
        stopWhen: stepCountIs(6),
        onStepFinish: async (step: {
          role?: string;
          text?: string;
          toolCalls?: unknown;
          toolResults?: Array<{
            toolName?: string;
            result?: unknown;
            output?: unknown;
          }>;
          usage?: {
            promptTokens?: number;
            completionTokens?: number;
            inputTokens?: number;
            outputTokens?: number;
          };
        }) => {
          const tokensIn =
            step.usage?.inputTokens ?? step.usage?.promptTokens;
          const tokensOut =
            step.usage?.outputTokens ?? step.usage?.completionTokens;
          await ctx.runMutation(agent.threads.persistStep, {
            threadId,
            step: {
              role: (step.role ?? "assistant") as
                | "assistant"
                | "tool"
                | "system",
              text: step.text,
              toolCallsJson: step.toolCalls
                ? JSON.stringify(step.toolCalls)
                : undefined,
              tokensIn,
              tokensOut,
              modelId,
            },
          });

          if (Array.isArray(step.toolResults)) {
            for (const tr of step.toolResults) {
              const { payload, proposalId } = normalizeToolResult(
                tr.output ?? tr.result ?? null,
              );
              await ctx.runMutation(agent.threads.persistStep, {
                threadId,
                step: {
                  role: "tool" as const,
                  toolName: tr.toolName,
                  toolResultJson: JSON.stringify(payload),
                  proposalId,
                },
              });
            }
          }

          if (tokensIn || tokensOut) {
            await ctx.runMutation(agent.budgets.recordUsage, {
              userId,
              modelId,
              tokensIn: tokensIn ?? 0,
              tokensOut: tokensOut ?? 0,
            });
          }
        },
      } as any);
      // Drain the stream so onStepFinish callbacks fire and the underlying
      // fetch completes before the action returns.
      for await (const _chunk of (result as any).textStream ?? []) {
        // Consume; onStepFinish handles persistence.
      }
      await (result as any).text;
    } catch (err) {
      console.error("[agent.runtime] run failed:", err);
    } finally {
      try {
        await ctx.runAction(agent.compaction.maybeCompact, { threadId });
      } catch (err) {
        console.warn("[agent.runtime] compaction skipped:", err);
      }
    }
    return null;
  },
});
