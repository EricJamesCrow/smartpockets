"use client";

import type { FC } from "react";

import { RawTextMessage } from "./shared/RawTextMessage";
import type {
    ProposalToolOutput,
    ReadToolName,
    RegistryEntry,
    ToolResultComponentProps,
} from "./types";

/**
 * Fallback renderer used by all not-yet-wired entries. Subsequent W3 tasks
 * swap these for the real components.
 */
export function FallbackToRaw(props: ToolResultComponentProps) {
    const payload = props.output ?? props.input ?? {};
    return <RawTextMessage text={JSON.stringify(payload, null, 2)} />;
}

export const toolResultRegistry: Record<ReadToolName, RegistryEntry> = {
    list_accounts: { Component: FallbackToRaw },
    get_account_detail: { Component: FallbackToRaw },
    list_transactions: { Component: FallbackToRaw },
    get_transaction_detail: { Component: FallbackToRaw },
    list_credit_cards: { Component: FallbackToRaw },
    get_credit_card_detail: { Component: FallbackToRaw },
    list_deferred_interest_promos: { Component: FallbackToRaw },
    list_installment_plans: { Component: FallbackToRaw },
    get_spend_by_category: { Component: FallbackToRaw },
    get_spend_over_time: { Component: FallbackToRaw },
    get_upcoming_statements: { Component: FallbackToRaw },
    list_reminders: { Component: FallbackToRaw },
    search_merchants: { Component: FallbackToRaw },
    get_plaid_health: { Component: FallbackToRaw },
    get_proposal: { Component: FallbackToRaw },
};

/**
 * Renders every `propose_*` tool result. The dispatcher keys the propose-tool
 * prefix to this fallback; Task 11 swaps the body to `ProposalConfirmCard`.
 */
export const proposalFallback: FC<ToolResultComponentProps<unknown, ProposalToolOutput>> =
    FallbackToRaw;
