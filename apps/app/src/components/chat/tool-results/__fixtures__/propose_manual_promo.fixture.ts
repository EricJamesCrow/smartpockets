import { proposeFixture } from "./_proposal-helpers";

const BASE_CREATED = new Date("2026-04-20T12:00:00Z").getTime();

export const awaitingConfirmation = proposeFixture({
    toolName: "propose_manual_promo",
    proposalId: "agentProposals:fx-promo",
    state: "awaiting_confirmation",
    scope: "single",
    summary: 'Add "Balance transfer 0% APR" promo to Chase card',
    patch: {
        kind: ["(none)", "Balance transfer"],
        apr: ["(none)", 0],
        endDate: ["(none)", "2026-10-31"],
    },
    affectedIds: ["creditCards:fx-chase"],
    affectedCount: 1,
    createdAt: BASE_CREATED,
});

export const executed = proposeFixture({
    toolName: "propose_manual_promo",
    proposalId: "agentProposals:fx-promo-executed",
    state: "executed",
    scope: "single",
    summary: "Added manual promo to Chase card",
    patch: {
        kind: ["(none)", "Balance transfer"],
        apr: ["(none)", 0],
        endDate: ["(none)", "2026-10-31"],
    },
    affectedIds: ["creditCards:fx-chase"],
    affectedCount: 1,
    createdAt: BASE_CREATED,
    undoExpiresAt: Date.now() + 9 * 60_000,
    reversalToken: "rev-tok-fx-promo",
});

export const failed = proposeFixture({
    toolName: "propose_manual_promo",
    proposalId: "agentProposals:fx-promo-failed",
    state: "failed",
    scope: "single",
    summary: 'Add "Balance transfer 0% APR" promo',
    patch: {
        kind: ["(none)", "Balance transfer"],
        apr: ["(none)", 0],
        endDate: ["(none)", "2026-10-31"],
    },
    affectedIds: ["creditCards:fx-chase"],
    affectedCount: 1,
    createdAt: BASE_CREATED,
    errorSummary: "Start date must be before end date.",
});
