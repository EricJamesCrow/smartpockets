"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useChatInteraction } from "@/components/chat/ChatInteractionContext";
import type { AgentProposalId, ToolName } from "../types";

/**
 * Typed wrapper around `ChatInteractionContext.sendMessage` that hides the
 * `toolHint` shape behind named helpers. Every drill-in and card action inside
 * a `tool-results/` component should call one of these instead of raw
 * `sendMessage`.
 *
 * Spec: specs/W3-generative-ui.md §3.6.
 *
 * Proposal confirmation must use the trusted public mutation. The backend
 * executor only runs proposals after that mutation moves them into the
 * `confirmed` state and persists any destructive-confirmation signal.
 */
export function useToolHintSend() {
    const { sendMessage } = useChatInteraction();
    const confirmProposalMutation = useMutation((api as any).agent.proposals.confirm);
    const cancelProposalMutation = useMutation((api as any).agent.proposals.cancel);

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
        createReminder: (prefill: { title: string; dueAt: number; relatedResourceType?: string; relatedResourceId?: string }) =>
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
        confirmProposal: (proposalId: AgentProposalId) => confirmProposalMutation({ proposalId }),
        cancelProposal: (proposalId: AgentProposalId) => cancelProposalMutation({ proposalId }),
        undoMutation: (reversalToken: string) =>
            sendMessage({
                text: "Undo",
                toolHint: { tool: "undo_mutation", args: { reversalToken } },
            }),
        /**
         * Re-dispatch a tool call that previously surfaced as `output-error`.
         * The dispatcher (`ToolResultRenderer`) is responsible for gating which
         * tools are eligible - this helper is the transport. CROWDEV-393.
         */
        retryFailedTool: (tool: ToolName, args: Record<string, unknown>) =>
            sendMessage({
                text: "Retry",
                toolHint: { tool, args },
            }),
    };
}
