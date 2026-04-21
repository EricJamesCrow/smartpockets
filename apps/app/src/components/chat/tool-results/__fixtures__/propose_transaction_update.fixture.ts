import { proposeFixture } from "./_proposal-helpers";

const BASE_CREATED = new Date("2026-04-20T12:00:00Z").getTime();

export const awaitingConfirmation_single = proposeFixture({
    toolName: "propose_transaction_update",
    proposalId: "agentProposals:fx-tx-single",
    state: "awaiting_confirmation",
    scope: "single",
    summary: "Update category for Blue Bottle Coffee",
    patch: { category: ["Uncategorized", "Food and Drink"] },
    affectedIds: ["plaid:plaidTransactions:fx-1"],
    affectedCount: 1,
    createdAt: BASE_CREATED,
});

export const awaitingConfirmation_single_withDrift = proposeFixture({
    toolName: "propose_transaction_update",
    proposalId: "agentProposals:fx-tx-drift",
    state: "awaiting_confirmation",
    scope: "single",
    summary: "Update category for Blue Bottle Coffee",
    patch: { category: ["Uncategorized", "Food and Drink"] },
    affectedIds: ["plaid:plaidTransactions:fx-drift-1"],
    affectedCount: 1,
    createdAt: BASE_CREATED,
    driftTransactionIds: ["plaid:plaidTransactions:fx-drift-1"],
});

export const executing = proposeFixture({
    toolName: "propose_transaction_update",
    proposalId: "agentProposals:fx-tx-executing",
    state: "executing",
    scope: "single",
    summary: "Update category for Blue Bottle Coffee",
    patch: { category: ["Uncategorized", "Food and Drink"] },
    affectedIds: ["plaid:plaidTransactions:fx-1"],
    affectedCount: 1,
    createdAt: BASE_CREATED,
});

export const executedWithinUndoWindow = proposeFixture({
    toolName: "propose_transaction_update",
    proposalId: "agentProposals:fx-tx-executed",
    state: "executed",
    scope: "single",
    summary: "Updated category for Blue Bottle Coffee",
    patch: { category: ["Uncategorized", "Food and Drink"] },
    affectedIds: ["plaid:plaidTransactions:fx-1"],
    affectedCount: 1,
    createdAt: BASE_CREATED,
    undoExpiresAt: Date.now() + 8 * 60_000,
    reversalToken: "rev-tok-fx-tx",
});

export const executedPastUndoWindow = proposeFixture({
    toolName: "propose_transaction_update",
    proposalId: "agentProposals:fx-tx-past-undo",
    state: "executed",
    scope: "single",
    summary: "Updated category for Blue Bottle Coffee",
    patch: { category: ["Uncategorized", "Food and Drink"] },
    affectedIds: ["plaid:plaidTransactions:fx-1"],
    affectedCount: 1,
    createdAt: BASE_CREATED - 60 * 60_000,
    undoExpiresAt: BASE_CREATED - 10 * 60_000,
});

export const cancelled = proposeFixture({
    toolName: "propose_transaction_update",
    proposalId: "agentProposals:fx-tx-cancelled",
    state: "cancelled",
    scope: "single",
    summary: "Update category for Blue Bottle Coffee",
    patch: { category: ["Uncategorized", "Food and Drink"] },
    affectedIds: ["plaid:plaidTransactions:fx-1"],
    affectedCount: 1,
    createdAt: BASE_CREATED,
});

export const timedOut = proposeFixture({
    toolName: "propose_transaction_update",
    proposalId: "agentProposals:fx-tx-timed-out",
    state: "timed_out",
    scope: "single",
    summary: "Update category for Blue Bottle Coffee",
    patch: { category: ["Uncategorized", "Food and Drink"] },
    affectedIds: ["plaid:plaidTransactions:fx-1"],
    affectedCount: 1,
    createdAt: BASE_CREATED - 60 * 60_000,
});

export const reverted = proposeFixture({
    toolName: "propose_transaction_update",
    proposalId: "agentProposals:fx-tx-reverted",
    state: "reverted",
    scope: "single",
    summary: "Updated category for Blue Bottle Coffee",
    patch: { category: ["Uncategorized", "Food and Drink"] },
    affectedIds: ["plaid:plaidTransactions:fx-1"],
    affectedCount: 1,
    createdAt: BASE_CREATED - 30 * 60_000,
    revertedAt: BASE_CREATED - 25 * 60_000,
});

export const failed = proposeFixture({
    toolName: "propose_transaction_update",
    proposalId: "agentProposals:fx-tx-failed",
    state: "failed",
    scope: "single",
    summary: "Update category for Blue Bottle Coffee",
    patch: { category: ["Uncategorized", "Food and Drink"] },
    affectedIds: ["plaid:plaidTransactions:fx-1"],
    affectedCount: 1,
    createdAt: BASE_CREATED,
    errorSummary: "Write rate limit exceeded (write.propose bucket).",
});
