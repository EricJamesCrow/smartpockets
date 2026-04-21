import { proposeFixture } from "./_proposal-helpers";

const BASE_CREATED = new Date("2026-04-20T12:00:00Z").getTime();

export const awaitingConfirmation = proposeFixture({
    toolName: "propose_credit_card_metadata_update",
    proposalId: "agentProposals:fx-card-meta",
    state: "awaiting_confirmation",
    scope: "single",
    summary: 'Rename "Sapphire Reserve" to "Chase Travel Card"',
    patch: { displayName: ["Sapphire Reserve", "Chase Travel Card"] },
    affectedIds: ["creditCards:fx-chase"],
    affectedCount: 1,
    createdAt: BASE_CREATED,
});

export const executedWithinUndoWindow = proposeFixture({
    toolName: "propose_credit_card_metadata_update",
    proposalId: "agentProposals:fx-card-meta-executed",
    state: "executed",
    scope: "single",
    summary: 'Renamed card to "Chase Travel Card"',
    patch: { displayName: ["Sapphire Reserve", "Chase Travel Card"] },
    affectedIds: ["creditCards:fx-chase"],
    affectedCount: 1,
    createdAt: BASE_CREATED,
    undoExpiresAt: Date.now() + 9 * 60_000,
    reversalToken: "rev-tok-fx-card",
});

export const cancelled = proposeFixture({
    toolName: "propose_credit_card_metadata_update",
    proposalId: "agentProposals:fx-card-meta-cancelled",
    state: "cancelled",
    scope: "single",
    summary: 'Rename "Sapphire Reserve" to "Chase Travel Card"',
    patch: { displayName: ["Sapphire Reserve", "Chase Travel Card"] },
    affectedIds: ["creditCards:fx-chase"],
    affectedCount: 1,
    createdAt: BASE_CREATED,
});
