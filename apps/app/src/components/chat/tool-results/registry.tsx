"use client";

import type { FC } from "react";

import { AccountsSummary } from "./accounts/AccountsSummary";
import { AccountsSummarySkeleton } from "./accounts/AccountsSummarySkeleton";
import { CreditCardStatementCard } from "./credit-cards/CreditCardStatementCard";
import { CreditCardStatementCardSkeleton } from "./credit-cards/CreditCardStatementCardSkeleton";
import { RawTextMessage } from "./shared/RawTextMessage";
import { TransactionDetailCard } from "./transactions/TransactionDetailCard";
import { TransactionDetailCardSkeleton } from "./transactions/TransactionDetailCardSkeleton";
import { TransactionsTable } from "./transactions/TransactionsTable";
import { TransactionsTableSkeleton } from "./transactions/TransactionsTableSkeleton";
import type {
    ProposalToolOutput,
    ReadToolName,
    RegistryEntry,
    ToolResultComponentProps,
} from "./types";

// Registry entries must conform to the default `ToolResultComponentProps`
// shape. Per-component signatures are narrower (typed `Output` generic); they
// are cast here at registration time and remain type-safe at the call site.
type AnyEntry = RegistryEntry<unknown, unknown>;

/**
 * Fallback renderer used by all not-yet-wired entries. Subsequent W3 tasks
 * swap these for the real components.
 */
export function FallbackToRaw(props: ToolResultComponentProps) {
    const payload = props.output ?? props.input ?? {};
    return <RawTextMessage text={JSON.stringify(payload, null, 2)} />;
}

export const toolResultRegistry: Record<ReadToolName, RegistryEntry> = {
    list_accounts: { Component: AccountsSummary as AnyEntry["Component"], Skeleton: AccountsSummarySkeleton },
    get_account_detail: { Component: AccountsSummary as AnyEntry["Component"], Skeleton: AccountsSummarySkeleton },
    list_transactions: { Component: TransactionsTable as AnyEntry["Component"], Skeleton: TransactionsTableSkeleton },
    get_transaction_detail: { Component: TransactionDetailCard as AnyEntry["Component"], Skeleton: TransactionDetailCardSkeleton },
    list_credit_cards: { Component: CreditCardStatementCard as AnyEntry["Component"], Skeleton: CreditCardStatementCardSkeleton },
    get_credit_card_detail: { Component: CreditCardStatementCard as AnyEntry["Component"], Skeleton: CreditCardStatementCardSkeleton },
    list_deferred_interest_promos: { Component: FallbackToRaw },
    list_installment_plans: { Component: FallbackToRaw },
    get_spend_by_category: { Component: FallbackToRaw },
    get_spend_over_time: { Component: FallbackToRaw },
    get_upcoming_statements: { Component: CreditCardStatementCard as AnyEntry["Component"], Skeleton: CreditCardStatementCardSkeleton },
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
