import type {
    AgentProposalId,
    AgentThreadId,
    ProposalToolOutput,
    ToolName,
    ToolResultComponentProps,
} from "../types";
import type {
    AgentProposalRow,
    LivePreviewOverrides,
} from "../shared/liveRowsHooks";

export const FX_THREAD_ID = "fx-thread" as unknown as AgentThreadId;

/**
 * Helper: build a reusable propose-fixture entry.
 *
 * Returns:
 *   - `props`: the ToolResultComponentProps<...> the harness hands the card.
 *   - `overrides`: a LivePreviewOverrides payload with the mock proposal row
 *     and any mock affected-rows the drift banner needs.
 */
export function proposeFixture({
    toolName,
    proposalId: raw,
    state,
    scope,
    summary,
    patch,
    affectedIds = [],
    affectedCount,
    sampleJson,
    createdAt = Date.now(),
    undoExpiresAt,
    reversalToken,
    revertedAt,
    errorSummary,
    driftTransactionIds,
}: {
    toolName: ToolName;
    proposalId: string;
    state: AgentProposalRow["state"];
    scope: "single" | "bulk";
    summary: string;
    patch: Record<string, unknown>;
    affectedIds?: string[];
    affectedCount?: number;
    sampleJson?: string;
    createdAt?: number;
    undoExpiresAt?: number;
    reversalToken?: string;
    revertedAt?: number;
    errorSummary?: string;
    driftTransactionIds?: string[];
}): {
    props: ToolResultComponentProps<unknown, ProposalToolOutput>;
    overrides: LivePreviewOverrides;
} {
    const proposalId = raw as unknown as AgentProposalId;
    const resolvedAffectedCount = affectedCount ?? affectedIds.length;
    const row: AgentProposalRow = {
        _id: proposalId,
        _creationTime: createdAt,
        toolName,
        scope,
        state,
        summaryText: summary,
        affectedCount: resolvedAffectedCount,
        affectedIds,
        sampleJson: sampleJson ?? JSON.stringify({ patch, affectedIds }, null, 2),
        patch,
        awaitingExpiresAt: createdAt + 10 * 60 * 1000,
        executedAt: state === "executed" || state === "reverted" ? createdAt + 30_000 : undefined,
        undoExpiresAt,
        revertedAt,
        reversalToken,
        errorSummary,
        createdAt,
    };

    const overrides: LivePreviewOverrides = {
        proposals: { [proposalId as unknown as string]: row },
    };

    if (driftTransactionIds && driftTransactionIds.length > 0) {
        overrides.transactions = {};
        for (const id of driftTransactionIds) {
            overrides.transactions[id] = {
                _id: id,
                _updateTime: createdAt + 5 * 60 * 1000,
                date: "2026-04-19",
                amount: 1200,
                name: "Drifted row",
                merchantName: "Drifted row",
                categoryPrimary: "Unknown",
            };
        }
    }

    const props: ToolResultComponentProps<unknown, ProposalToolOutput> = {
        toolName,
        threadId: FX_THREAD_ID,
        input: {},
        state: "output-available",
        proposalId,
        output: {
            proposalId,
            scope,
            summary,
            sample: sampleJson ?? { patch, affectedIds },
            affectedCount: resolvedAffectedCount,
        },
    };

    return { props, overrides };
}
