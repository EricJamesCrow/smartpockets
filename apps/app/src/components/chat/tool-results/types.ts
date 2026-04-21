"use client";

import type { FC } from "react";
import type { GenericId } from "convex/values";

// Placeholder ID types: the `agentThreads` and `agentProposals` tables are
// introduced by W2. Until W2 lands, we brand plain strings as Id<T> so the
// component API and fixtures typecheck. Once the tables exist in
// `@convex/_generated/dataModel`, swap these for direct imports.
export type AgentThreadId = GenericId<"agentThreads">;
export type AgentProposalId = GenericId<"agentProposals">;

export type PartState =
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";

export type ReadToolName =
    | "list_accounts"
    | "get_account_detail"
    | "list_transactions"
    | "get_transaction_detail"
    | "list_credit_cards"
    | "get_credit_card_detail"
    | "list_deferred_interest_promos"
    | "list_installment_plans"
    | "get_spend_by_category"
    | "get_spend_over_time"
    | "get_upcoming_statements"
    | "list_reminders"
    | "search_merchants"
    | "get_plaid_health"
    | "get_proposal";

export type ProposeToolName =
    | "propose_transaction_update"
    | "propose_bulk_transaction_update"
    | "propose_credit_card_metadata_update"
    | "propose_manual_promo"
    | "propose_reminder_create"
    | "propose_reminder_delete";

export type ExecuteToolName = "execute_confirmed_proposal" | "cancel_proposal" | "undo_mutation" | "trigger_plaid_resync";

export type ToolName = ReadToolName | ProposeToolName | ExecuteToolName;

export type ToolOutput<TPreview = unknown> = {
    ids: string[];
    preview: TPreview & { live?: boolean; capturedAt?: string };
    window?: { from: string; to: string; granularity?: "day" | "week" | "month" };
};

export type ProposalToolOutput = {
    proposalId: AgentProposalId;
    scope: "single" | "bulk";
    summary: string;
    sample: unknown;
    affectedCount: number;
};

export type ProposalDiff = {
    patch: Record<string, unknown>;
    affectedIds: string[];
    sampleFirst: Array<{ id: string; before: Record<string, unknown>; after: Record<string, unknown> }>;
    sampleLast: Array<{ id: string; before: Record<string, unknown>; after: Record<string, unknown> }>;
    totalAffected: number;
};

export type ToolResultComponentProps<Input = unknown, Output = unknown> = {
    toolName: ToolName;
    input: Input;
    output: Output | null;
    state: PartState;
    errorText?: string;
    proposalId?: AgentProposalId;
    threadId: AgentThreadId;
};

export type RegistryEntry<Input = unknown, Output = unknown> = {
    Component: FC<ToolResultComponentProps<Input, Output>>;
    Skeleton?: FC<{ input?: Input }>;
};
// Variant is not a registry field: components read `scope` directly from the
// runtime payload (ProposalToolOutput.scope per contracts §1.6 / §4).
