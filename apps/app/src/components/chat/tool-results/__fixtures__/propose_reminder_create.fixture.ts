import { proposeFixture } from "./_proposal-helpers";

const BASE_CREATED = new Date("2026-04-20T12:00:00Z").getTime();

export const awaitingConfirmation = proposeFixture({
    toolName: "propose_reminder_create",
    proposalId: "agentProposals:fx-rem-create",
    state: "awaiting_confirmation",
    scope: "single",
    summary: "Remind me to pay Chase statement",
    patch: {
        title: ["(none)", "Pay Chase statement"],
        dueAt: ["(none)", "2026-04-27"],
    },
    affectedIds: [],
    affectedCount: 1,
    createdAt: BASE_CREATED,
});

export const executedWithinUndoWindow = proposeFixture({
    toolName: "propose_reminder_create",
    proposalId: "agentProposals:fx-rem-create-exec",
    state: "executed",
    scope: "single",
    summary: "Created reminder: Pay Chase statement",
    patch: {
        title: ["(none)", "Pay Chase statement"],
        dueAt: ["(none)", "2026-04-27"],
    },
    affectedIds: ["reminders:fx-new"],
    affectedCount: 1,
    createdAt: BASE_CREATED,
    undoExpiresAt: Date.now() + 9 * 60_000,
    reversalToken: "rev-tok-fx-rem-create",
});
