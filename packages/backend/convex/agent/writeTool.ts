/**
 * W5 write-tool wrapper.
 *
 * Two helpers callable from within an `agentMutation`:
 *   - createProposal: Strategy C-prime insert with unique contentHash dedup.
 *   - executeWriteTool: loads a confirmed proposal, dispatches to the
 *     registered per-tool executor, writes an `auditLog` row, transitions
 *     the proposal to `executed`, and returns an opaque `rev_<base32>`
 *     reversal token.
 *
 * Per-tool executors register themselves at module-import time via
 * `registerToolExecutor(toolName, handler)`. The reversal registry is
 * populated alongside in W5.3 (`registerReversal`).
 */
import type { Id } from "../_generated/dataModel";
import { idempotencyKey } from "../notifications/hashing";
import { agentLimiter } from "./rateLimits";

// ---- Tool executor registry -------------------------------------------------

export interface ExecutorResult {
    /** JSON-serializable payload used to reverse this execution. */
    reversalPayload: unknown;
    /** Target resource ids touched by the execution (for auditLog). */
    affectedIds: Array<string>;
    /** Short one-line summary for the reversal-tool response. */
    summary: string;
}

// Ctx is deliberately loose: executors receive the caller's agentMutation ctx
// (Ents write context). Typing this strictly creates an import cycle with
// the generated server types, so we keep it narrow.
export type ToolExecutor = (
    ctx: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    proposal: any, // eslint-disable-line @typescript-eslint/no-explicit-any
) => Promise<ExecutorResult>;

const toolExecuteRegistry = new Map<string, ToolExecutor>();

export function registerToolExecutor(toolName: string, handler: ToolExecutor) {
    toolExecuteRegistry.set(toolName, handler);
}

export function unregisterToolExecutor(toolName: string) {
    toolExecuteRegistry.delete(toolName);
}

export function getToolExecutor(toolName: string): ToolExecutor | undefined {
    return toolExecuteRegistry.get(toolName);
}

// ---- Reversal registry (W5.3) ----------------------------------------------

export type ReversalHandler = (
    ctx: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    audit: any, // eslint-disable-line @typescript-eslint/no-explicit-any
) => Promise<{ summary: string }>;

const reversalRegistry = new Map<string, ReversalHandler>();

export function registerReversal(toolName: string, handler: ReversalHandler) {
    reversalRegistry.set(toolName, handler);
}

export function getReversalHandler(toolName: string): ReversalHandler | undefined {
    return reversalRegistry.get(toolName);
}

// ---- Destructive-action gating (W5.11) -------------------------------------

/**
 * Tools in this set require `confirmDestructive: true` to execute.
 * Populated by per-tool modules at import time via `markDestructive`.
 */
export const DESTRUCTIVE_TOOLS = new Set<string>();

export function markDestructive(toolName: string) {
    DESTRUCTIVE_TOOLS.add(toolName);
}

const READ_ONLY_ENV_KEYS = [
    "AGENT_READ_ONLY_MODE",
    "SMARTPOCKETS_READ_ONLY_MODE",
    "SMARTPOCKETS_DEMO_MODE",
] as const;

function isTruthyEnv(value: string | undefined): boolean {
    return value === "1" || value?.toLowerCase() === "true" || value?.toLowerCase() === "yes" || value?.toLowerCase() === "on";
}

export function isAgentReadOnlyMode(env: Record<string, string | undefined> = process.env): boolean {
    return READ_ONLY_ENV_KEYS.some((key) => isTruthyEnv(env[key]));
}

export function assertAgentSideEffectsAllowed() {
    if (isAgentReadOnlyMode()) {
        throw new Error("read_only_mode");
    }
}

// ---- Strategy C-prime insert -----------------------------------------------

export interface CreateProposalArgs {
    /** Full registry name, already prefixed with `propose_` (e.g. `propose_transaction_update`). */
    toolName: string;
    argsJson: string;
    summaryText: string;
    affectedCount: number;
    affectedIds: Array<string>;
    sampleJson: string;
    scope: "single" | "bulk";
    threadId: Id<"agentThreads">;
    awaitingExpiresAt: number;
}

export interface CreateProposalResult {
    proposalId: Id<"agentProposals">;
    preview: string;
    deduped: boolean;
}

export async function createProposal(
    ctx: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    args: CreateProposalArgs,
): Promise<CreateProposalResult> {
    assertAgentSideEffectsAllowed();
    const viewer = ctx.viewerX();

    // First-turn-read-before-write guard (W5.11): the agent must have made
    // at least one read call in this thread before it may propose a write.
    // Applied here so every propose-tool handler inherits the guard.
    const thread = await ctx.table("agentThreads").getX(args.threadId);
    if (thread.userId !== viewer._id) {
        throw new Error("not_authorized");
    }
    if ((thread.readCallCount ?? 0) < 1) {
        throw new Error("first_turn_guard");
    }

    const contentHash = await idempotencyKey({
        userId: viewer._id,
        // Dedupe only identical proposals. The patch/args are part of the
        // identity so two edits to the same target in a thread do not collapse.
        scope: `${args.toolName}:${args.argsJson}`,
        threadId: args.threadId,
        ids: [...args.affectedIds].sort(),
    });

    try {
        const proposalId = await ctx.table("agentProposals").insert({
            toolName: args.toolName,
            argsJson: args.argsJson,
            summaryText: args.summaryText,
            affectedCount: args.affectedCount,
            sampleJson: args.sampleJson,
            scope: args.scope,
            state: "awaiting_confirmation",
            awaitingExpiresAt: args.awaitingExpiresAt,
            userId: viewer._id,
            agentThreadId: args.threadId,
            contentHash,
        });
        return { proposalId, preview: args.sampleJson, deduped: false };
    } catch (err) {
        if (!isUniqueConstraintError(err)) throw err;
        const existing = await ctx.table("agentProposals").get("contentHash", contentHash);
        if (existing == null) {
            throw new Error("Strategy C-prime: unique constraint fired but lookup returned null");
        }
        return {
            proposalId: existing._id,
            preview: existing.sampleJson,
            deduped: true,
        };
    }
}

// ---- Unique-constraint detection -------------------------------------------

export function isUniqueConstraintError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const m = err.message;
    return (
        m.includes("UniqueConstraintError") ||
        m.includes("unique constraint") ||
        m.includes("Uniqueness") ||
        m.includes("unique field") ||
        m.includes("contentHash")
    );
}

// ---- executeWriteTool ------------------------------------------------------

export interface ExecuteWriteToolArgs {
    proposalId: Id<"agentProposals">;
    threadId: Id<"agentThreads">;
}

export interface ExecuteWriteToolExecutedResult {
    reversalToken: string;
    summary: string;
    auditLogId: Id<"auditLog">;
    state: "executed";
    executedAt: number;
    undoExpiresAt: number;
    /** True when a prior execute call already wrote this auditLog row. */
    alreadyExecuted?: boolean;
}

export interface ExecuteWriteToolFailedResult {
    summary: string;
    state: "failed";
    error: string;
}

export type ExecuteWriteToolResult = ExecuteWriteToolExecutedResult | ExecuteWriteToolFailedResult;

const UNDO_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_RETRY_AFTER_MS = 60_000;

function retryAfterSeconds(retryAfterMs: number | undefined): number {
    return Math.max(1, Math.ceil((retryAfterMs ?? DEFAULT_RETRY_AFTER_MS) / 1000));
}

function storedFailureMessage(proposal: { errorJson?: string }): string {
    if (!proposal.errorJson) return "execution_failed";
    try {
        const stored = JSON.parse(proposal.errorJson) as { message?: string };
        return publicExecutionError(stored.message);
    } catch {
        return "execution_failed";
    }
}

function failedExecuteResult(proposal: { summaryText?: string }, message: string): ExecuteWriteToolFailedResult {
    return {
        summary: proposal.summaryText ?? "Proposal execution failed.",
        state: "failed",
        error: publicExecutionError(message),
    };
}

function publicExecutionError(message: unknown): string {
    if (typeof message !== "string" || message.length === 0) return "execution_failed";
    if (/^[a-z][a-z0-9_:-]{0,79}$/i.test(message)) return message;
    return "execution_failed";
}

export async function executeWriteTool(
    ctx: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    args: ExecuteWriteToolArgs,
): Promise<ExecuteWriteToolResult> {
    const viewer = ctx.viewerX();
    const proposal = await ctx.table("agentProposals").getX(args.proposalId);

    if (proposal.userId !== viewer._id) {
        throw new Error("not_authorized");
    }
    if (proposal.agentThreadId !== args.threadId) {
        throw new Error("proposal_invalid_state: thread mismatch");
    }

    // Idempotent retry: a second execute for an already-executed proposal
    // re-derives the reversal token from the existing auditLog row instead of
    // double-executing. Per W5 spec §7.2 / §15.6.
    if (proposal.state === "executed") {
        const priorAudits = await ctx.table("auditLog", "by_proposal", (q: any) => q.eq("proposalId", args.proposalId));
        const original = priorAudits.find((a: { reversalOfAuditId?: Id<"auditLog"> }) => a.reversalOfAuditId === undefined);
        if (original == null) {
            throw new Error("proposal_invalid_state: executed without auditLog");
        }
        return {
            reversalToken: encodeReversalToken(original._id),
            summary: proposal.summaryText,
            auditLogId: original._id,
            state: "executed",
            executedAt: proposal.executedAt ?? original.executedAt,
            undoExpiresAt: proposal.undoExpiresAt ?? original.executedAt + UNDO_WINDOW_MS,
            alreadyExecuted: true,
        };
    }

    // Idempotent failure: a retry after a failed execute surfaces the stored
    // error instead of re-attempting (which could fail differently or succeed
    // against partially-mutated state).
    if (proposal.state === "failed") {
        return failedExecuteResult(proposal, storedFailureMessage(proposal));
    }

    if (proposal.state !== "confirmed") {
        throw new Error(`proposal_invalid_state: expected confirmed, got ${proposal.state}`);
    }

    if (isAgentReadOnlyMode()) {
        const message = "read_only_mode";
        await proposal.patch({
            state: "failed",
            errorJson: JSON.stringify({ message }),
        });
        return failedExecuteResult(proposal, message);
    }

    // Destructive gating (W5.11): the trusted signal lives on the proposal
    // row, set only by the user-triggered `confirm` mutation. The LLM cannot
    // reach this field through tool args.
    if (DESTRUCTIVE_TOOLS.has(proposal.toolName) && proposal.userConfirmedDestructive !== true) {
        const message = "destructive_unconfirmed";
        await proposal.patch({
            state: "failed",
            errorJson: JSON.stringify({ message }),
        });
        return failedExecuteResult(proposal, message);
    }

    if (DESTRUCTIVE_TOOLS.has(proposal.toolName)) {
        try {
            const rl = await (agentLimiter as any).limit(ctx, "destructive_ops", {
                key: viewer._id,
            });
            if (!rl.ok) {
                throw new Error(`destructive_rate_limited: retry in ${retryAfterSeconds(rl.retryAfter)}s`);
            }
        } catch (err) {
            if (err instanceof Error && err.message.startsWith("destructive_rate_limited")) {
                throw err;
            }
            console.warn("[agent.writeTool] destructive rate-limit check failed:", err);
            throw new Error("destructive_rate_limit_unavailable");
        }
    }

    const executor = getToolExecutor(proposal.toolName);
    if (!executor) {
        throw new Error(`no_executor_registered: ${proposal.toolName} has no W5 executor`);
    }

    // CAS to executing.
    await proposal.patch({ state: "executing" });

    let result: ExecutorResult;
    try {
        result = await executor(ctx, proposal);
    } catch (err) {
        // Let Convex roll back any executor writes in this mutation. Persisting
        // failed state after a partial executor throw would commit those writes.
        throw err;
    }

    const now = Date.now();
    const undoExpiresAt = now + UNDO_WINDOW_MS;
    const auditLogId = (await ctx.table("auditLog").insert({
        threadId: args.threadId,
        proposalId: args.proposalId,
        toolName: proposal.toolName,
        inputArgsJson: proposal.argsJson,
        affectedIdsJson: JSON.stringify(result.affectedIds),
        executedAt: now,
        reversalPayloadJson: JSON.stringify(result.reversalPayload),
        userId: viewer._id,
    })) as Id<"auditLog">;

    await proposal.patch({
        state: "executed",
        executedAt: now,
        undoExpiresAt,
    });

    return {
        reversalToken: encodeReversalToken(auditLogId),
        summary: result.summary,
        auditLogId,
        state: "executed",
        executedAt: now,
        undoExpiresAt,
    };
}

// ---- Opaque reversal token (rev_<base32>) ----------------------------------

const BASE32_ALPHA = "abcdefghijklmnopqrstuvwxyz234567";

export function base32Encode(input: string): string {
    const bytes = new TextEncoder().encode(input);
    let bits = 0;
    let value = 0;
    let out = "";
    for (const byte of bytes) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            out += BASE32_ALPHA[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        out += BASE32_ALPHA[(value << (5 - bits)) & 31];
    }
    return out;
}

export function base32Decode(input: string): string {
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];
    for (const ch of input) {
        const idx = BASE32_ALPHA.indexOf(ch);
        if (idx < 0) throw new Error("invalid_base32_character");
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
}

export function encodeReversalToken(auditLogId: string): string {
    return `rev_${base32Encode(auditLogId)}`;
}

export function decodeReversalToken(token: string): string {
    if (!token.startsWith("rev_")) {
        throw new Error("reversal_token_invalid_prefix");
    }
    return base32Decode(token.slice(4));
}

// ---- undoByToken (W5.3) ----------------------------------------------------

export interface UndoByTokenArgs {
    reversalToken: string;
    threadId: Id<"agentThreads">;
}

export interface UndoByTokenResult {
    summary: string;
    auditLogId: Id<"auditLog">;
    undoAuditLogId: Id<"auditLog"> | null;
    state: "reverted";
    revertedAt: number;
    /** True when undo was called on an already-reverted audit row. */
    alreadyReverted?: boolean;
}

export async function undoByToken(
    ctx: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    args: UndoByTokenArgs,
): Promise<UndoByTokenResult> {
    assertAgentSideEffectsAllowed();
    const viewer = ctx.viewerX();

    let auditLogId: string;
    try {
        auditLogId = decodeReversalToken(args.reversalToken);
    } catch {
        throw new Error("reversal_token_not_found");
    }

    const audit = await ctx.table("auditLog").get(auditLogId as Id<"auditLog">);
    if (!audit) throw new Error("reversal_token_not_found");
    if (audit.userId !== viewer._id) throw new Error("reversal_token_not_found");
    if (audit.threadId !== args.threadId) {
        throw new Error("reversal_token_not_found");
    }

    // Idempotent retry: undo on an already-reverted audit row is a no-op
    // that returns a consistent success envelope. Per W5 review criteria.
    if (audit.reversedAt !== undefined) {
        return {
            summary: "Already reverted.",
            auditLogId: audit._id,
            undoAuditLogId: null,
            state: "reverted",
            revertedAt: audit.reversedAt,
            alreadyReverted: true,
        };
    }
    if (Date.now() - audit.executedAt >= UNDO_WINDOW_MS) {
        throw new Error("undo_window_expired");
    }

    const proposal = await ctx.table("agentProposals").getX(audit.proposalId);
    if (proposal.userId !== viewer._id || proposal.agentThreadId !== audit.threadId) {
        throw new Error("reversal_token_not_found");
    }
    if (proposal.state !== "executed") {
        throw new Error(`proposal_invalid_state: expected executed, got ${proposal.state}`);
    }

    const handler = getReversalHandler(audit.toolName);
    if (!handler) {
        throw new Error(`unsupported_reversal: ${audit.toolName}`);
    }

    const { summary } = await handler(ctx, audit);

    const now = Date.now();
    await audit.patch({ reversedAt: now });

    const undoAuditLogId = (await ctx.table("auditLog").insert({
        threadId: audit.threadId,
        proposalId: audit.proposalId,
        toolName: audit.toolName,
        inputArgsJson: audit.inputArgsJson,
        affectedIdsJson: audit.affectedIdsJson,
        executedAt: now,
        reversalPayloadJson: "{}",
        reversalOfAuditId: audit._id,
        userId: viewer._id,
    })) as Id<"auditLog">;

    await proposal.patch({ state: "reverted", revertedAt: now });

    return {
        summary,
        auditLogId: audit._id,
        undoAuditLogId,
        state: "reverted",
        revertedAt: now,
    };
}
