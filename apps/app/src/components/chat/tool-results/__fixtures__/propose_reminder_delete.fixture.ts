import { proposeFixture } from "./_proposal-helpers";

const BASE_CREATED = new Date("2026-04-20T12:00:00Z").getTime();

export const awaitingConfirmation = proposeFixture({
    toolName: "propose_reminder_delete",
    proposalId: "agentProposals:fx-rem-del",
    state: "awaiting_confirmation",
    scope: "single",
    summary: "Delete reminder: Pay Chase statement",
    patch: {
        deleted: ["Pay Chase statement", "(removed)"],
    },
    affectedIds: ["reminders:fx-pay-chase"],
    affectedCount: 1,
    createdAt: BASE_CREATED,
});

export const executed = proposeFixture({
    toolName: "propose_reminder_delete",
    proposalId: "agentProposals:fx-rem-del-exec",
    state: "executed",
    scope: "single",
    summary: "Deleted reminder: Pay Chase statement",
    patch: {
        deleted: ["Pay Chase statement", "(removed)"],
    },
    affectedIds: ["reminders:fx-pay-chase"],
    affectedCount: 1,
    createdAt: BASE_CREATED,
    undoExpiresAt: Date.now() + 6 * 60_000,
    reversalToken: "rev-tok-fx-rem-del",
});

export const reverted = proposeFixture({
    toolName: "propose_reminder_delete",
    proposalId: "agentProposals:fx-rem-del-reverted",
    state: "reverted",
    scope: "single",
    summary: "Deleted reminder: Pay Chase statement",
    patch: {
        deleted: ["Pay Chase statement", "(removed)"],
    },
    affectedIds: ["reminders:fx-pay-chase"],
    affectedCount: 1,
    createdAt: BASE_CREATED - 30 * 60_000,
    revertedAt: BASE_CREATED - 25 * 60_000,
});
