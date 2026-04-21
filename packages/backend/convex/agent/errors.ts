import type { Id } from "../_generated/dataModel";

export type ErrorCode =
  | "not_authorized"
  | "not_found"
  | "rate_limited"
  | "budget_exhausted"
  | "validation_failed"
  | "timed_out"
  | "downstream_failed"
  | "first_turn_guard"
  | "proposal_timed_out"
  | "proposal_invalid_state";

export type ToolEnvelope<T> =
  | {
      ok: true;
      data: T;
      meta: { rowsRead: number; durationMs: number; truncated?: boolean };
    }
  | {
      ok: false;
      error: { code: ErrorCode; message: string; retryable: boolean };
    };

export type ProposalToolOutput = {
  proposalId: Id<"agentProposals">;
  scope: "single" | "bulk";
  summary: string;
  sample: unknown;
  affectedCount: number;
};

export type AgentError =
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "budget_exhausted"; reason: string }
  | { kind: "llm_down" }
  | { kind: "reconsent_required"; plaidItemId: string }
  | { kind: "first_turn_guard" }
  | { kind: "proposal_timed_out" }
  | { kind: "proposal_invalid_state" };
