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

import { idempotencyKey } from "../notifications/hashing";
import type { Id } from "../_generated/dataModel";

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

export function getToolExecutor(toolName: string): ToolExecutor | undefined {
  return toolExecuteRegistry.get(toolName);
}

// ---- Destructive-action gating (wired in W5.11) -----------------------------

export const DESTRUCTIVE_TOOLS: ReadonlySet<string> = new Set<string>([
  // Populated as destructive tools land:
  //   "trigger_plaid_resync",
  //   "propose_plaid_item_remove",
  //   "propose_card_hard_delete",
]);

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
  const viewer = ctx.viewerX();

  const contentHash = await idempotencyKey({
    userId: viewer._id,
    scope: args.toolName,
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
    const rows = await ctx.table("agentProposals");
    const existing = rows.find(
      (p: { contentHash?: string }) => p.contentHash === contentHash,
    );
    if (existing == null) {
      throw new Error(
        "Strategy C-prime: unique constraint fired but lookup returned null",
      );
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
  /** True when the caller explicitly opted into a destructive operation. */
  confirmDestructive?: boolean;
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

export type ExecuteWriteToolResult =
  | ExecuteWriteToolExecutedResult
  | ExecuteWriteToolFailedResult;

const UNDO_WINDOW_MS = 10 * 60 * 1000;

function storedFailureMessage(proposal: { errorJson?: string }): string {
  if (!proposal.errorJson) return "execution_failed";
  try {
    const stored = JSON.parse(proposal.errorJson) as { message?: string };
    return stored.message ?? "execution_failed";
  } catch {
    return "execution_failed";
  }
}

function failedExecuteResult(
  proposal: { summaryText?: string },
  message: string,
): ExecuteWriteToolFailedResult {
  return {
    summary: proposal.summaryText ?? "Proposal execution failed.",
    state: "failed",
    error: message,
  };
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
    const priorAudits = await ctx.table("auditLog", "by_proposal", (q: any) =>
      q.eq("proposalId", args.proposalId),
    );
    const original = priorAudits.find(
      (a: { reversalOfAuditId?: Id<"auditLog"> }) =>
        a.reversalOfAuditId === undefined,
    );
    if (original == null) {
      throw new Error("proposal_invalid_state: executed without auditLog");
    }
    return {
      reversalToken: encodeReversalToken(original._id),
      summary: proposal.summaryText,
      auditLogId: original._id,
      state: "executed",
      executedAt: proposal.executedAt ?? original.executedAt,
      undoExpiresAt:
        proposal.undoExpiresAt ?? original.executedAt + UNDO_WINDOW_MS,
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
  if (
    DESTRUCTIVE_TOOLS.has(proposal.toolName) &&
    args.confirmDestructive !== true
  ) {
    const message = "destructive_unconfirmed";
    await proposal.patch({
      state: "failed",
      errorJson: JSON.stringify({ message }),
    });
    return failedExecuteResult(proposal, message);
  }

  const executor = getToolExecutor(proposal.toolName);
  if (!executor) {
    throw new Error(
      `no_executor_registered: ${proposal.toolName} has no W5 executor`,
    );
  }

  // CAS to executing.
  await proposal.patch({ state: "executing" });

  let result: ExecutorResult;
  try {
    result = await executor(ctx, proposal);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await proposal.patch({
      state: "failed",
      errorJson: JSON.stringify({ message }),
    });
    return failedExecuteResult(proposal, message);
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
