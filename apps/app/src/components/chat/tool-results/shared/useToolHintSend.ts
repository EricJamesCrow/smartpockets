"use client";

import type { Id } from "@convex/_generated/dataModel";

import { useChatInteraction } from "@/components/chat/ChatInteractionContext";

import type { AgentProposalId } from "../types";

/**
 * Typed wrapper around `ChatInteractionContext.sendMessage` that hides the
 * `toolHint` shape behind named helpers. Every drill-in and card action inside
 * a `tool-results/` component should call one of these instead of raw
 * `sendMessage`.
 *
 * Spec: specs/W3-generative-ui.md §3.6.
 *
 * Reconciliation M12 requires that Confirm / Cancel / Undo on
 * `ProposalConfirmCard` route through the agent tool-path
 * (`execute_confirmed_proposal` / `cancel_proposal` / `undo_mutation`) via
 * `sendMessage` + `toolHint`, NOT via direct Convex mutations. Do not add
 * mutation equivalents for those three actions to this hook.
 */
export function useToolHintSend() {
    const { sendMessage } = useChatInteraction();

    return {
        openTransaction: (transactionId: string) =>
            sendMessage({
                text: "Open transaction",
                toolHint: { tool: "get_transaction_detail", args: { transactionId } },
            }),
        openCard: (cardId: Id<"creditCards">) =>
            sendMessage({
                text: "Open card",
                toolHint: { tool: "get_credit_card_detail", args: { cardId } },
            }),
        filterTransactionsByCategory: (category: string) =>
            sendMessage({
                text: `Show ${category} transactions`,
                toolHint: { tool: "list_transactions", args: { category } },
            }),
        filterTransactionsByWindow: (from: string, to: string) =>
            sendMessage({
                text: `Show transactions from ${from} to ${to}`,
                toolHint: { tool: "list_transactions", args: { window: { from, to } } },
            }),
        filterByInstitution: (plaidItemId: string) =>
            sendMessage({
                text: "Show transactions for this institution",
                toolHint: { tool: "list_transactions", args: { plaidItemId } },
            }),
        createReminder: (prefill: {
            title: string;
            dueAt: number;
            relatedResourceType?: string;
            relatedResourceId?: string;
        }) =>
            sendMessage({
                text: `Create a reminder: ${prefill.title}`,
                toolHint: { tool: "propose_reminder_create", args: prefill },
            }),
        deleteReminder: (reminderId: string) =>
            sendMessage({
                text: "Delete this reminder",
                toolHint: { tool: "propose_reminder_delete", args: { reminderId } },
            }),
        editTransactionCategory: (transactionId: string, currentCategory: string | null) =>
            sendMessage({
                text: "Recategorize this transaction",
                toolHint: {
                    tool: "propose_transaction_update",
                    args: { transactionId, currentCategory },
                },
            }),
        addManualPromo: (cardId: Id<"creditCards">) =>
            sendMessage({
                text: "Add a manual promo for this card",
                toolHint: { tool: "propose_manual_promo", args: { cardId } },
            }),
        editCardMetadata: (cardId: Id<"creditCards">, field: string) =>
            sendMessage({
                text: `Edit ${field} on this card`,
                toolHint: { tool: "propose_credit_card_metadata_update", args: { cardId, field } },
            }),
        // Proposal actions: all three route through the agent tool-path so W5's
        // write-wrapper (rate limit, first-turn guard, audit log, workflow)
        // fires. Do not add direct Convex mutation equivalents here; that would
        // bypass contracts §2.3 tools 21-23 (reconciliation M12).
        confirmProposal: (proposalId: AgentProposalId) =>
            sendMessage({
                text: "Confirm",
                toolHint: { tool: "execute_confirmed_proposal", args: { proposalId } },
            }),
        cancelProposal: (proposalId: AgentProposalId) =>
            sendMessage({
                text: "Cancel",
                toolHint: { tool: "cancel_proposal", args: { proposalId } },
            }),
        undoMutation: (reversalToken: string) =>
            sendMessage({
                text: "Undo",
                toolHint: { tool: "undo_mutation", args: { reversalToken } },
            }),
    };
}
