"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Id } from "@convex/_generated/dataModel";

import type { AgentProposalId } from "../types";

// ============================================================================
// CR-5 STUB HOOKS
// ============================================================================
//
// These hooks are the live-data subscription surface for W3 components. Each
// corresponds to a helper query that does NOT yet exist in
// `@convex/_generated/api` and must be provided by W2 / W5:
//
//   - api.transactions.queries.getManyByIds       (W2 or W5)
//   - api.creditCards.queries.getMany             (W2)
//   - api.plaidAccounts.queries.getManyByIds      (W2)
//   - api.promoRates.queries.getManyByIds         (W5 area)
//   - api.installmentPlans.queries.getManyByIds   (W5 area)
//   - api.reminders.queries.getManyByIds          (W2)
//   - api.agent.proposals.get                     (W2 - also tool `get_proposal`)
//
// Spec: specs/W3-generative-ui.md §9.2 CR-5; research §3.5.
//
// Until those queries land, each hook returns `undefined` so component
// skeletons render during preview-harness walkthroughs. Fixtures carry
// hard-coded `preview` payloads so the UI still demonstrates end-to-end.
//
// The preview harness at `/dev/tool-results` additionally wraps its fixture
// tree in `<LivePreviewOverrideProvider>` with mock rows so components that
// depend on reactive subscriptions (notably `ProposalConfirmCard`) can render
// every state without a live Convex backend.
//
// When the queries land, replace each hook's body with:
//
//   import { useQuery } from "convex-helpers/react/cache/hooks";
//   import { api } from "@convex/_generated/api";
//   return useQuery(api.transactions.queries.getManyByIds, ids.length > 0 ? { ids } : "skip");
//
// The preview context can be kept or removed once real queries exist; it is a
// no-op in the absence of a provider.
// ============================================================================

type TransactionRow = {
    _id: string;
    _updateTime?: number;
    date: string;
    amount: number;
    merchantName?: string | null;
    name: string;
    categoryPrimary?: string | null;
    pending?: boolean;
    logoUrl?: string | null;
};

type CreditCardRow = {
    _id: Id<"creditCards">;
    _updateTime?: number;
    displayName: string;
    company?: string | null;
    mask?: string | null;
    currentBalance?: number | null;
    creditLimit?: number | null;
    availableCredit?: number | null;
    isOverdue?: boolean;
    nextPaymentDueDate?: string | null;
    statementClosingDay?: number | null;
    plaidItemId?: string | null;
};

type PlaidAccountRow = {
    _id: string;
    _updateTime?: number;
    name: string;
    officialName?: string | null;
    mask?: string | null;
    type: string;
    subtype?: string | null;
    balances: { current?: number | null; available?: number | null; limit?: number | null };
    plaidItemId: string;
    institutionName?: string | null;
};

type PromoRateRow = {
    _id: string;
    _updateTime?: number;
    creditCardId: Id<"creditCards">;
    kind: string;
    apr: number;
    startDate: string;
    endDate: string;
    balance?: number | null;
    note?: string | null;
};

type InstallmentPlanRow = {
    _id: string;
    _updateTime?: number;
    creditCardId: Id<"creditCards">;
    merchantName: string;
    totalAmount: number;
    monthlyPayment: number;
    totalPayments: number;
    remainingPayments: number;
    startDate: string;
    endDate: string;
};

type ReminderRow = {
    _id: string;
    _updateTime?: number;
    title: string;
    dueAt: number;
    notes?: string | null;
    isDone: boolean;
    doneAt?: number | null;
    dismissedAt?: number | null;
    relatedResourceType: "creditCard" | "promoRate" | "installmentPlan" | "transaction" | "none";
    relatedResourceId?: string | null;
    channels: Array<"chat" | "email">;
    createdByAgent: boolean;
};

type AgentProposalRow = {
    _id: AgentProposalId;
    _creationTime: number;
    _updateTime?: number;
    toolName: string;
    scope: "single" | "bulk";
    state:
        | "proposed"
        | "awaiting_confirmation"
        | "confirmed"
        | "executing"
        | "executed"
        | "cancelled"
        | "timed_out"
        | "reverted"
        | "failed";
    summaryText: string;
    affectedCount: number;
    affectedIds?: string[];
    sampleJson: string;
    patch?: Record<string, unknown>;
    awaitingExpiresAt: number;
    executedAt?: number;
    undoExpiresAt?: number;
    revertedAt?: number;
    reversalToken?: string;
    errorSummary?: string;
    createdAt: number;
};

// Preview harness override context. Keyed by the entity ID; each value is the
// row the hook should return. Any hook with no matching override falls through
// to `undefined` (skeleton).
export type LivePreviewOverrides = {
    proposals?: Record<string, AgentProposalRow | null>;
    transactions?: Record<string, TransactionRow | null>;
    creditCards?: Record<string, CreditCardRow | null>;
    plaidAccounts?: Record<string, PlaidAccountRow | null>;
    promoRates?: Record<string, PromoRateRow | null>;
    installmentPlans?: Record<string, InstallmentPlanRow | null>;
    reminders?: Record<string, ReminderRow | null>;
};

const LivePreviewOverrideContext = createContext<LivePreviewOverrides | null>(null);

export function LivePreviewOverrideProvider({
    value,
    children,
}: {
    value: LivePreviewOverrides;
    children: ReactNode;
}) {
    return (
        <LivePreviewOverrideContext.Provider value={value}>
            {children}
        </LivePreviewOverrideContext.Provider>
    );
}

function collect<T>(
    ids: string[],
    overrides: Record<string, T | null> | undefined,
): T[] | undefined {
    if (!overrides || ids.length === 0) return undefined;
    const found: T[] = [];
    for (const id of ids) {
        const row = overrides[id];
        if (row) found.push(row);
    }
    return found;
}

export function useLiveTransactions(ids: string[]): TransactionRow[] | undefined {
    const overrides = useContext(LivePreviewOverrideContext);
    const hit = collect<TransactionRow>(ids, overrides?.transactions);
    if (hit) return hit;
    // CR-5: api.transactions.queries.getManyByIds pending from W2/W5 plan.
    return undefined;
}

export function useLiveCreditCards(ids: Array<Id<"creditCards">>): CreditCardRow[] | undefined {
    const overrides = useContext(LivePreviewOverrideContext);
    const hit = collect<CreditCardRow>(ids as unknown as string[], overrides?.creditCards);
    if (hit) return hit;
    // CR-5: api.creditCards.queries.getMany pending from W2 plan.
    return undefined;
}

export function useLivePlaidAccounts(ids: string[]): PlaidAccountRow[] | undefined {
    const overrides = useContext(LivePreviewOverrideContext);
    const hit = collect<PlaidAccountRow>(ids, overrides?.plaidAccounts);
    if (hit) return hit;
    // CR-5: api.plaidAccounts.queries.getManyByIds pending from W2 plan.
    return undefined;
}

export function useLivePromoRates(ids: string[]): PromoRateRow[] | undefined {
    const overrides = useContext(LivePreviewOverrideContext);
    const hit = collect<PromoRateRow>(ids, overrides?.promoRates);
    if (hit) return hit;
    // CR-5: api.promoRates.queries.getManyByIds pending from W5 plan.
    return undefined;
}

export function useLiveInstallmentPlans(ids: string[]): InstallmentPlanRow[] | undefined {
    const overrides = useContext(LivePreviewOverrideContext);
    const hit = collect<InstallmentPlanRow>(ids, overrides?.installmentPlans);
    if (hit) return hit;
    // CR-5: api.installmentPlans.queries.getManyByIds pending from W5 plan.
    return undefined;
}

export function useLiveReminders(ids: string[]): ReminderRow[] | undefined {
    const overrides = useContext(LivePreviewOverrideContext);
    const hit = collect<ReminderRow>(ids, overrides?.reminders);
    if (hit) return hit;
    // CR-5: api.reminders.queries.getManyByIds pending from W2 plan.
    return undefined;
}

export function useLiveProposal(
    proposalId: AgentProposalId | undefined,
): AgentProposalRow | null | undefined {
    const overrides = useContext(LivePreviewOverrideContext);
    if (overrides?.proposals && proposalId) {
        const hit = overrides.proposals[proposalId as unknown as string];
        if (hit !== undefined) return hit;
    }
    // CR-5: api.agent.proposals.get pending from W2 plan.
    return undefined;
}

export type {
    TransactionRow,
    CreditCardRow,
    PlaidAccountRow,
    PromoRateRow,
    InstallmentPlanRow,
    ReminderRow,
    AgentProposalRow,
};
