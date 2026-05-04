"use client";

import type { FC } from "react";

import { AccountsSummary } from "./accounts/AccountsSummary";
import { AccountsSummarySkeleton } from "./accounts/AccountsSummarySkeleton";
import { SpendByCategoryChart } from "./charts/SpendByCategoryChart";
import { SpendByCategoryChartSkeleton } from "./charts/SpendByCategoryChartSkeleton";
import { SpendOverTimeChart } from "./charts/SpendOverTimeChart";
import { SpendOverTimeChartSkeleton } from "./charts/SpendOverTimeChartSkeleton";
import { CreditCardStatementCard } from "./credit-cards/CreditCardStatementCard";
import { CreditCardStatementCardSkeleton } from "./credit-cards/CreditCardStatementCardSkeleton";
import { MerchantsList } from "./merchants/MerchantsList";
import { MerchantsListSkeleton } from "./merchants/MerchantsListSkeleton";
import { PlaidHealthSummary } from "./plaid-health/PlaidHealthSummary";
import { PlaidHealthSummarySkeleton } from "./plaid-health/PlaidHealthSummarySkeleton";
import { DeferredInterestTimeline } from "./promos/DeferredInterestTimeline";
import { DeferredInterestTimelineSkeleton } from "./promos/DeferredInterestTimelineSkeleton";
import { InstallmentPlansList } from "./promos/InstallmentPlansList";
import { InstallmentPlansListSkeleton } from "./promos/InstallmentPlansListSkeleton";
import { ProposalConfirmCard } from "./proposals/ProposalConfirmCard";
import { ProposalConfirmCardSkeleton } from "./proposals/ProposalConfirmCardSkeleton";
import { RemindersList } from "./reminders/RemindersList";
import { RemindersListSkeleton } from "./reminders/RemindersListSkeleton";
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
    list_deferred_interest_promos: { Component: DeferredInterestTimeline as AnyEntry["Component"], Skeleton: DeferredInterestTimelineSkeleton },
    list_installment_plans: { Component: InstallmentPlansList as AnyEntry["Component"], Skeleton: InstallmentPlansListSkeleton },
    get_spend_by_category: { Component: SpendByCategoryChart as AnyEntry["Component"], Skeleton: SpendByCategoryChartSkeleton },
    get_spend_over_time: { Component: SpendOverTimeChart as AnyEntry["Component"], Skeleton: SpendOverTimeChartSkeleton },
    get_upcoming_statements: { Component: CreditCardStatementCard as AnyEntry["Component"], Skeleton: CreditCardStatementCardSkeleton },
    list_reminders: { Component: RemindersList as AnyEntry["Component"], Skeleton: RemindersListSkeleton },
    search_merchants: { Component: MerchantsList as AnyEntry["Component"], Skeleton: MerchantsListSkeleton },
    get_plaid_health: { Component: PlaidHealthSummary as AnyEntry["Component"], Skeleton: PlaidHealthSummarySkeleton },
    get_proposal: {
        Component: function GetProposalRenderer(props: ToolResultComponentProps) {
            const output = props.output as ProposalToolOutput | null;
            const proposalId = output?.proposalId ?? props.proposalId;
            if (!proposalId) return <ProposalConfirmCardSkeleton />;
            return <ProposalConfirmCard proposalId={proposalId} />;
        },
        Skeleton: ProposalConfirmCardSkeleton,
    },
};

/**
 * Renders every `propose_*` tool result. The dispatcher keys the propose-tool
 * prefix to this fallback and extracts proposalId from the ProposalToolOutput
 * payload. Per M12 reconciliation, the card drives all three actions
 * (Confirm / Cancel / Undo) through `sendMessage` + `toolHint` rather than
 * direct Convex mutations.
 */
export const proposalFallback: FC<ToolResultComponentProps<unknown, ProposalToolOutput>> = (
    props,
) => {
    const proposalId = props.output?.proposalId ?? props.proposalId;
    if (!proposalId) return <ProposalConfirmCardSkeleton />;
    return <ProposalConfirmCard proposalId={proposalId} />;
};
