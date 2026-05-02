import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { AGENT_DEFAULT_MODEL, getAnthropicModel } from "./config";
import { agentLimiter } from "./rateLimits";
import { AGENT_TOOLS, isRegisteredToolName, isSideEffectfulTool, toolRequiresExplicitConfirmation } from "./registry";
import { PROMPT_VERSION, renderSystemPrompt } from "./system";
import { isAgentReadOnlyMode } from "./writeTool";

const agent = internal.agent;
const DEFAULT_RETRY_AFTER_MS = 60_000;
const DEFAULT_TOOL_OUTPUT_TOKEN_CAP = 15_000;
const TOOL_HINT_ARGS_MAX_CHARS = 4_000;

type ToolEnvelope =
    | { ok: true; data?: unknown; meta?: unknown }
    | { ok: false; error?: { code?: unknown; message?: unknown; retryable?: unknown } };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function safeJsonStringify(value: unknown): string {
    try {
        const serialized = JSON.stringify(value);
        return typeof serialized === "string" ? serialized : "null";
    } catch {
        return JSON.stringify({ unserializable: true });
    }
}

function publicErrorCode(err: unknown, fallback = "downstream_failed"): string {
    const message = err instanceof Error ? err.message : typeof err === "string" ? err : "";
    if (message.startsWith("not_authorized") || message.startsWith("Not authorized")) return "not_authorized";
    if (message.startsWith("invalid_args") || message.includes("validation")) return "validation_failed";
    if (message.startsWith("first_turn_guard")) return "first_turn_guard";
    if (message.startsWith("proposal_timed_out")) return "proposal_timed_out";
    if (message.startsWith("proposal_invalid_state")) return "proposal_invalid_state";
    if (message.startsWith("destructive_unconfirmed")) return "confirmation_required";
    if (message.startsWith("read_only_mode")) return "read_only_mode";
    if (message.startsWith("rate_limited")) return "rate_limited";
    return fallback;
}

function publicErrorMessage(code: string): string {
    switch (code) {
        case "not_authorized":
            return "Not authorized.";
        case "validation_failed":
            return "The tool arguments were invalid.";
        case "first_turn_guard":
            return "Make a read call before proposing a write.";
        case "proposal_timed_out":
            return "The proposal timed out.";
        case "proposal_invalid_state":
            return "The proposal is not in a valid state for this action.";
        case "confirmation_required":
            return "Explicit user confirmation is required before this action can run.";
        case "read_only_mode":
            return "This action is disabled in demo/read-only mode.";
        case "rate_limited":
            return "Rate limit reached; retry shortly.";
        case "rate_limit_unavailable":
            return "Rate limit check unavailable; retry shortly.";
        default:
            return "The tool failed. Try again shortly.";
    }
}

export function sanitizedToolError(
    err: unknown,
    opts: { fallbackCode?: string; retryable?: boolean } = {},
): { code: string; message: string; retryable: boolean } {
    const code = publicErrorCode(err, opts.fallbackCode);
    return {
        code,
        message: publicErrorMessage(code),
        retryable: opts.retryable ?? (code === "downstream_failed" || code === "rate_limit_unavailable"),
    };
}

function proposalIdFromPayload(payload: unknown): Id<"agentProposals"> | undefined {
    if (isRecord(payload) && typeof payload.proposalId === "string") {
        return payload.proposalId as Id<"agentProposals">;
    }
    if (isRecord(payload) && isRecord(payload.data) && typeof payload.data.proposalId === "string") {
        return payload.data.proposalId as Id<"agentProposals">;
    }
    return undefined;
}

export function normalizeToolResult(raw: unknown): {
    payload: unknown;
    proposalId?: Id<"agentProposals">;
} {
    let payload = raw;

    if (isRecord(raw) && "ok" in raw) {
        const envelope = raw as ToolEnvelope;
        if (envelope.ok === true) {
            payload = envelope;
        } else {
            const err = envelope.error ?? {};
            const code = typeof err.code === "string" ? err.code : "downstream_failed";
            payload = {
                ok: false as const,
                error: {
                    ...sanitizedToolError(code, {
                        fallbackCode: code,
                        retryable: typeof err.retryable === "boolean" ? err.retryable : undefined,
                    }),
                },
            };
        }
    }

    const proposalId = proposalIdFromPayload(payload);

    return { payload, proposalId };
}

function retryAfterSeconds(retryAfterMs: number | undefined): number {
    return Math.max(1, Math.ceil((retryAfterMs ?? DEFAULT_RETRY_AFTER_MS) / 1000));
}

export function shouldFailClosedOnRateLimitError(bucket: string): boolean {
    return bucket === "write_single" || bucket === "write_bulk" || bucket === "write_expensive";
}

type ReductionLimits = {
    depth: number;
    arrayItems: number;
    stringChars: number;
    objectKeys: number;
};

const REDUCTION_TIERS: ReductionLimits[] = [
    { depth: 5, arrayItems: 25, stringChars: 512, objectKeys: 24 },
    { depth: 4, arrayItems: 12, stringChars: 256, objectKeys: 16 },
    { depth: 3, arrayItems: 6, stringChars: 160, objectKeys: 12 },
    { depth: 2, arrayItems: 3, stringChars: 96, objectKeys: 8 },
];

function jsonLength(value: unknown): number {
    return safeJsonStringify(value).length;
}

function reduceValue(value: unknown, limits: ReductionLimits, depth = 0): unknown {
    if (value == null || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
        if (value.length <= limits.stringChars) return value;
        return `${value.slice(0, limits.stringChars)}... [truncated ${value.length - limits.stringChars} chars]`;
    }
    if (Array.isArray(value)) {
        if (depth >= limits.depth) {
            return { __truncatedArray: true, count: value.length };
        }
        const items = value.slice(0, limits.arrayItems).map((item) => reduceValue(item, limits, depth + 1));
        if (value.length > limits.arrayItems) {
            items.push({ __omittedItems: value.length - limits.arrayItems });
        }
        return items;
    }
    if (isRecord(value)) {
        if (depth >= limits.depth) {
            return { __truncatedObject: true, keyCount: Object.keys(value).length };
        }
        const out: Record<string, unknown> = {};
        const entries = Object.entries(value);
        for (const [key, child] of entries.slice(0, limits.objectKeys)) {
            out[key] = reduceValue(child, limits, depth + 1);
        }
        if (entries.length > limits.objectKeys) {
            out.__omittedKeys = entries.length - limits.objectKeys;
        }
        return out;
    }
    return null;
}

function wrapReducedToolResult(reduced: unknown, originalChars: number): unknown {
    const summary = {
        truncated: true,
        originalChars,
        note: "Tool output exceeded the per-call budget and was summarized before returning to the model.",
    };
    if (isPlainObject(reduced)) {
        return { ...reduced, __truncated: true, __summary: summary };
    }
    return { value: reduced, __truncated: true, __summary: summary };
}

export function reduceToolOutputForModel(
    raw: unknown,
    tokenCap = DEFAULT_TOOL_OUTPUT_TOKEN_CAP,
): { data: unknown; truncated: boolean; originalChars: number; reducedChars: number } {
    const maxChars = Math.max(256, Math.floor(tokenCap * 4));
    const originalChars = jsonLength(raw);
    if (originalChars <= maxChars) {
        return { data: raw, truncated: false, originalChars, reducedChars: originalChars };
    }

    for (const limits of REDUCTION_TIERS) {
        const candidate = wrapReducedToolResult(reduceValue(raw, limits), originalChars);
        const reducedChars = jsonLength(candidate);
        if (reducedChars <= maxChars && reducedChars < originalChars) {
            return { data: candidate, truncated: true, originalChars, reducedChars };
        }
    }

    const minimal = {
        __truncated: true,
        __summary: {
            truncated: true,
            originalChars,
            note: "Tool output exceeded the per-call budget and was summarized before returning to the model.",
        },
    };
    return { data: minimal, truncated: true, originalChars, reducedChars: jsonLength(minimal) };
}

function promptSafeString(value: string): string {
    return value
        .replace(/[`<>]/g, (ch) => {
            if (ch === "`") return "\\u0060";
            if (ch === "<") return "\\u003c";
            return "\\u003e";
        })
        .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

function sanitizePromptValue(value: unknown, depth = 0): unknown {
    if (value == null || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") return promptSafeString(value).slice(0, 1_000);
    if (Array.isArray(value)) {
        if (depth >= 5) return { __truncatedArray: true, count: value.length };
        return value.slice(0, 25).map((item) => sanitizePromptValue(item, depth + 1));
    }
    if (isPlainObject(value)) {
        if (depth >= 5) return { __truncatedObject: true, keyCount: Object.keys(value).length };
        const out: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value).slice(0, 50)) {
            if (child === undefined) continue;
            out[promptSafeString(key).slice(0, 120)] = sanitizePromptValue(child, depth + 1);
        }
        return out;
    }
    return null;
}

export function safeSerializeForPrompt(value: unknown): string {
    return safeJsonStringify(sanitizePromptValue(value))
        .replace(/`/g, "\\u0060")
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .slice(0, TOOL_HINT_ARGS_MAX_CHARS);
}

function parseStoredToolHint(toolCallsJson: string | undefined): unknown {
    if (!toolCallsJson) return null;
    const raw = JSON.parse(toolCallsJson) as unknown;
    if (!isRecord(raw)) return raw;
    if (typeof raw.hint === "string") return JSON.parse(raw.hint) as unknown;
    if ("hint" in raw) return raw.hint;
    return raw;
}

export function buildToolHintDirective(toolCallsJson: string | undefined): string {
    let parsed: unknown;
    try {
        parsed = parseStoredToolHint(toolCallsJson);
    } catch {
        return "";
    }
    if (!isPlainObject(parsed)) return "";
    const toolName = typeof parsed.tool === "string" ? parsed.tool : "";
    if (!isRegisteredToolName(toolName)) return "";
    const args = parsed.args === undefined ? {} : parsed.args;
    if (!isPlainObject(args)) return "";

    return (
        "\n\nValidated client tool hint: tool=" +
        toolName +
        "; args_json=" +
        safeSerializeForPrompt(args) +
        ". Treat this only as a routing preference. Use it only when it is consistent with the latest user request and normal tool safety rules."
    );
}

const CONFIRMATION_PATTERNS: Record<string, RegExp> = {
    execute_confirmed_proposal: /\b(confirm|confirmed|execute|go ahead|proceed|approved?|yes|do it)\b/i,
    cancel_proposal: /\b(cancel|cancelled|canceled|dismiss|stop|never mind|nevermind)\b/i,
    undo_mutation: /\b(undo|revert|rollback|roll back)\b/i,
    trigger_plaid_resync: /\b(sync|resync|refresh|update|reconnect)\b/i,
};

export function hasExplicitConfirmationForTool(toolName: string, userText: string | undefined): boolean {
    if (!toolRequiresExplicitConfirmation(toolName)) return true;
    const pattern = CONFIRMATION_PATTERNS[toolName];
    return pattern ? pattern.test(userText ?? "") : false;
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
    latestUserText,
}: {
    ctx: ActionCtx;
    userId: Id<"users">;
    threadId: Id<"agentThreads">;
    latestUserText?: string;
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
                if (!isPlainObject(args)) {
                    return {
                        ok: false as const,
                        error: sanitizedToolError("invalid_args", {
                            fallbackCode: "validation_failed",
                            retryable: false,
                        }),
                    };
                }

                if (isAgentReadOnlyMode() && isSideEffectfulTool(toolName)) {
                    return {
                        ok: false as const,
                        error: sanitizedToolError("read_only_mode", {
                            fallbackCode: "read_only_mode",
                            retryable: false,
                        }),
                    };
                }

                if (!hasExplicitConfirmationForTool(toolName, latestUserText)) {
                    return {
                        ok: false as const,
                        error: sanitizedToolError("confirmation_required", {
                            fallbackCode: "confirmation_required",
                            retryable: false,
                        }),
                    };
                }

                try {
                    const rl = await (agentLimiter as any).limit(ctx as unknown, def.bucket, { key: userId });
                    if (!rl.ok) {
                        const retryAfter = retryAfterSeconds(rl.retryAfter);
                        return {
                            ok: false as const,
                            error: {
                                code: "rate_limited" as const,
                                message: `Rate limit reached; retry in ${retryAfter}s.`,
                                retryable: true,
                            },
                        };
                    }
                } catch (err) {
                    console.warn(`[agent.runtime] rate-limit check failed for ${toolName}:`, err);
                    if (shouldFailClosedOnRateLimitError(def.bucket)) {
                        return {
                            ok: false as const,
                            error: sanitizedToolError("rate_limit_unavailable", {
                                fallbackCode: "rate_limit_unavailable",
                                retryable: true,
                            }),
                        };
                    }
                }

                if (def.firstTurnGuard) {
                    const guard: { ok: boolean; reason: string } = await ctx.runQuery(agent.proposals.checkFirstTurnGuard, { threadId });
                    if (!guard.ok) {
                        return {
                            ok: false as const,
                            error: {
                                code: "first_turn_guard" as const,
                                message: publicErrorMessage("first_turn_guard"),
                                retryable: false,
                            },
                        };
                    }
                }

                try {
                    const dispatchArgs = { ...args, userId, threadId };
                    const result =
                        def.handlerType === "mutation"
                            ? await ctx.runMutation(def.handler as any, dispatchArgs)
                            : await ctx.runQuery(def.handler as any, {
                                  ...args,
                                  userId,
                              });

                    if (def.incrementsReadCount) {
                        await ctx.runMutation(agent.threads.bumpReadCallCount, { threadId });
                    }

                    const cap = Number(process.env.AGENT_BUDGET_PER_TOOLCALL_TOKENS ?? 15000);
                    const reduced = reduceToolOutputForModel(
                        result,
                        Number.isFinite(cap) && cap > 0 ? cap : DEFAULT_TOOL_OUTPUT_TOKEN_CAP,
                    );

                    return {
                        ok: true as const,
                        data: reduced.data,
                        meta: {
                            rowsRead: -1,
                            durationMs: 0,
                            truncated: reduced.truncated || undefined,
                            originalChars: reduced.truncated ? reduced.originalChars : undefined,
                            reducedChars: reduced.truncated ? reduced.reducedChars : undefined,
                        },
                    };
                } catch (err) {
                    console.error(`[agent.runtime] tool ${toolName} failed:`, err);
                    return {
                        ok: false as const,
                        error: sanitizedToolError(err, { retryable: true }),
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
        const thread: { promptVersion?: string } = await ctx.runQuery(agent.threads.getForRun, { threadId });
        const [context, msgs] = await Promise.all([
            ctx.runQuery(agent.context.compose, {
                userId,
                threadId,
            }) as Promise<string>,
            ctx.runQuery(agent.threads.listMessagesInternal, {
                threadId,
            }) as Promise<Array<{ _id: string; role: string; text?: string; toolCallsJson?: string }>>,
        ]);
        const latestUserMessage = msgs.find((m) => m._id === (userMessageId as unknown as string));
        const tools = buildToolsForAgent({
            ctx,
            userId,
            threadId,
            latestUserText: latestUserMessage?.text,
        });
        const modelId = process.env.AGENT_MODEL_DEFAULT ?? AGENT_DEFAULT_MODEL;

        // M12: deterministic tool-hint path. The last user message may carry a
        // `toolCallsJson` with `{ tool, args }`; surface it to the model as a
        // directive so it calls that tool directly instead of re-deliberating.
        const toolHintDirective = buildToolHintDirective(latestUserMessage?.toolCallsJson);

        // CROWDEV-342: per-thread cancellation. `turnStartedAt` is the
        // reference epoch-ms; `abortRun` writes
        // `agentThreads.cancelledAtTurn = Date.now()` on stop. We treat any
        // flag value `>= turnStartedAt` as an abort signal for THIS run.
        // `controller` is wired into `streamText({ abortSignal })` so calling
        // `controller.abort()` halts the underlying fetch immediately.
        const turnStartedAt = Date.now();
        const controller = new AbortController();
        let cancelObserved = false;

        const isCancelledForThisTurn = async (): Promise<boolean> => {
            if (cancelObserved) return true;
            const flag: number | null = await ctx.runQuery(agent.threads.getCancelFlag, { threadId });
            if (flag !== null && flag >= turnStartedAt) {
                cancelObserved = true;
                return true;
            }
            return false;
        };

        try {
            const { streamText } = await import("ai");
            const messages: Array<{ role: string; content: string }> = await ctx.runQuery(agent.threads.loadForStream, { threadId });

            const { stepCountIs } = await import("ai");
            const result = streamText({
                model: getAnthropicModel(modelId) as any,
                abortSignal: controller.signal,
                system:
                    renderSystemPrompt({
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
                    // CROWDEV-342: gate persistence on the cancel flag.
                    // Pre-cancel steps fire `onStepFinish` before the flag is
                    // observed and persist normally; post-cancel steps that
                    // somehow still complete (race between flag-set and
                    // step-finish) are dropped so the cancelled turn doesn't
                    // produce orphan assistant rows after the system
                    // tombstone written by `abortRun`. Tokens consumed
                    // pre-cancel are still counted (correct billing); tokens
                    // for dropped post-cancel steps are not — providers
                    // typically don't charge for fully-aborted streams, and
                    // the AI SDK doesn't surface mid-step token deltas
                    // through `onStepFinish`.
                    if (await isCancelledForThisTurn()) return;

                    const tokensIn = step.usage?.inputTokens ?? step.usage?.promptTokens;
                    const tokensOut = step.usage?.outputTokens ?? step.usage?.completionTokens;
                    await ctx.runMutation(agent.threads.persistStep, {
                        threadId,
                        step: {
                            role: (step.role ?? "assistant") as "assistant" | "tool" | "system",
                            text: step.text,
                            toolCallsJson: step.toolCalls ? JSON.stringify(step.toolCalls) : undefined,
                            tokensIn,
                            tokensOut,
                            modelId,
                        },
                    });

                    if (Array.isArray(step.toolResults)) {
                        for (const tr of step.toolResults) {
                            const { payload, proposalId } = normalizeToolResult(tr.output ?? tr.result ?? null);
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
            // Drain the stream so onStepFinish callbacks fire and the
            // underlying fetch completes before the action returns. Poll the
            // cancel flag every ~50 chunks (cheap internal query) — frequent
            // enough for sub-second responsiveness in a typical Anthropic
            // text stream, sparse enough that the polling overhead is
            // negligible relative to streaming I/O. When tripped, abort the
            // controller (halts the underlying fetch) and break — the
            // tombstone written by `abortRun` is the authoritative end-of-run
            // marker, so we do NOT write another from here.
            const CANCEL_POLL_INTERVAL = 50;
            let chunkCount = 0;
            try {
                for await (const _chunk of (result as any).textStream ?? []) {
                    chunkCount += 1;
                    if (chunkCount % CANCEL_POLL_INTERVAL === 0) {
                        if (await isCancelledForThisTurn()) {
                            controller.abort();
                            break;
                        }
                    }
                }
                if (!cancelObserved) {
                    await (result as any).text;
                }
            } catch (err) {
                // `streamText` rejects with an AbortError once `abort()` is
                // called. Swallow that path silently — it's the expected
                // outcome of user-initiated stop. Anything else is real.
                if (cancelObserved || (err as { name?: string })?.name === "AbortError") {
                    // expected: user clicked stop.
                } else {
                    throw err;
                }
            }
        } catch (err) {
            // Don't log a user-initiated stop as an error.
            if (cancelObserved || (err as { name?: string })?.name === "AbortError") {
                // expected
            } else {
                console.error("[agent.runtime] run failed:", err);
            }
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
