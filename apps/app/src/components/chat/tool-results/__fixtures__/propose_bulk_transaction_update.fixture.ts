import { proposeFixture } from "./_proposal-helpers";

const BASE_CREATED = new Date("2026-04-20T12:00:00Z").getTime();

export const awaitingConfirmation_bulk = proposeFixture({
    toolName: "propose_bulk_transaction_update",
    proposalId: "agentProposals:fx-bulk",
    state: "awaiting_confirmation",
    scope: "bulk",
    summary: "Recategorize 42 Whole Foods transactions as Groceries",
    patch: { category: ["Food and Drink", "Groceries"] },
    affectedIds: Array.from({ length: 42 }, (_, i) => `plaid:plaidTransactions:fx-bulk-${i}`),
    affectedCount: 42,
    createdAt: BASE_CREATED,
});

export const awaitingConfirmation_irreversible = proposeFixture({
    toolName: "propose_bulk_transaction_update",
    proposalId: "agentProposals:fx-bulk-irreversible",
    state: "awaiting_confirmation",
    scope: "bulk",
    summary: "Recategorize 650 Amazon transactions as Shopping",
    patch: { category: ["Uncategorized", "Shopping"] },
    affectedIds: Array.from({ length: 650 }, (_, i) => `plaid:plaidTransactions:fx-bulk-irr-${i}`),
    affectedCount: 650,
    createdAt: BASE_CREATED,
});

export const executed = proposeFixture({
    toolName: "propose_bulk_transaction_update",
    proposalId: "agentProposals:fx-bulk-executed",
    state: "executed",
    scope: "bulk",
    summary: "Recategorized 42 Whole Foods transactions as Groceries",
    patch: { category: ["Food and Drink", "Groceries"] },
    affectedIds: Array.from({ length: 42 }, (_, i) => `plaid:plaidTransactions:fx-bulk-${i}`),
    affectedCount: 42,
    createdAt: BASE_CREATED,
    undoExpiresAt: Date.now() + 6 * 60_000,
    reversalToken: "rev-tok-fx-bulk",
});

export const failed = proposeFixture({
    toolName: "propose_bulk_transaction_update",
    proposalId: "agentProposals:fx-bulk-failed",
    state: "failed",
    scope: "bulk",
    summary: "Recategorize 42 Whole Foods transactions as Groceries",
    patch: { category: ["Food and Drink", "Groceries"] },
    affectedIds: Array.from({ length: 42 }, (_, i) => `plaid:plaidTransactions:fx-bulk-${i}`),
    affectedCount: 42,
    createdAt: BASE_CREATED,
    errorSummary: "12 rows failed validation; workflow rolled back.",
});
