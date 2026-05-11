"use client";

import { type ReactNode, createContext, useContext } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex-helpers/react/cache/hooks";
import type { AgentProposalId } from "../types";

// ============================================================================
// CR-5 LIVE ROW HOOKS
// ============================================================================
//
// These hooks are the live-data subscription surface for W3 components. They
// read through `api.agent.liveRows.*` so streamed tool cards hydrate from
// Convex after the initial agent preview payload lands.
//
// Spec: specs/W3-generative-ui.md §9.2 CR-5; research §3.5.
//
// The preview harness at `/dev/tool-results` additionally wraps its fixture
// tree in `<LivePreviewOverrideProvider>` with mock rows so components that
// depend on reactive subscriptions (notably `ProposalConfirmCard`) can render
// every state without a live Convex backend.
// ============================================================================

type TransactionRow = {
    _id: string;
    /** Same as Plaid `transactionId` (liveRows sets `_id` from it for table collection keys). */
    transactionId?: string;
    _updateTime?: number;
    date: string;
    amount: number; // canonical milliunits
    isoCurrencyCode?: string | null;
    merchantName?: string | null;
    name: string;
    accountId?: string;
    categoryPrimary?: string | null;
    pending?: boolean;
    logoUrl?: string | null;
    merchantEnrichment?: {
        merchantName: string;
        logoUrl?: string;
        categoryPrimary?: string;
        categoryIconUrl?: string;
        confidenceLevel: string;
    } | null;
    sourceInfo?: {
        cardId: string;
        displayName: string;
        lastFour?: string;
        brand?: string;
        institutionName?: string;
    };
};

type CreditCardRow = {
    _id: Id<"creditCards">;
    _updateTime?: number;
    displayName: string;
    company?: string | null;
    mask?: string | null;
    currentBalance?: number | null; // Native credit-card top-level dollars.
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
    institutionLogoBase64?: string | null;
    institutionPrimaryColor?: string | null;
};

type PromoRateRow = {
    _id: string;
    _updateTime?: number;
    creditCardId: Id<"creditCards">;
    kind: string;
    apr: number;
    startDate: string;
    endDate: string;
    balance?: number | null; // Native promo dollars.
    note?: string | null;
};

type InstallmentPlanRow = {
    _id: string;
    _updateTime?: number;
    creditCardId: Id<"creditCards">;
    merchantName: string;
    totalAmount: number; // Native installment dollars.
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
    state: "proposed" | "awaiting_confirmation" | "confirmed" | "executing" | "executed" | "cancelled" | "timed_out" | "reverted" | "failed";
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

export function LivePreviewOverrideProvider({ value, children }: { value: LivePreviewOverrides; children: ReactNode }) {
    return <LivePreviewOverrideContext.Provider value={value}>{children}</LivePreviewOverrideContext.Provider>;
}

function collect<T>(ids: string[], overrides: Record<string, T | null> | undefined): T[] | undefined {
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
    const live = useQuery((api as any).agent.liveRows.getTransactions, ids.length > 0 ? { ids } : "skip") as TransactionRow[] | undefined;
    const hit = collect<TransactionRow>(ids, overrides?.transactions);
    if (hit) return hit;
    return live;
}

export function useLiveCreditCards(ids: Array<Id<"creditCards">>): CreditCardRow[] | undefined {
    const overrides = useContext(LivePreviewOverrideContext);
    const live = useQuery((api as any).agent.liveRows.getCreditCards, ids.length > 0 ? { ids } : "skip") as CreditCardRow[] | undefined;
    const hit = collect<CreditCardRow>(ids as unknown as string[], overrides?.creditCards);
    if (hit) return hit;
    return live;
}

export function useLivePlaidAccounts(ids: string[]): PlaidAccountRow[] | undefined {
    const overrides = useContext(LivePreviewOverrideContext);
    const live = useQuery((api as any).agent.liveRows.getPlaidAccounts, ids.length > 0 ? { ids } : "skip") as PlaidAccountRow[] | undefined;
    const hit = collect<PlaidAccountRow>(ids, overrides?.plaidAccounts);
    if (hit) return hit;
    return live;
}

export function useLivePromoRates(ids: string[]): PromoRateRow[] | undefined {
    const overrides = useContext(LivePreviewOverrideContext);
    const live = useQuery((api as any).agent.liveRows.getPromoRates, ids.length > 0 ? { ids } : "skip") as PromoRateRow[] | undefined;
    const hit = collect<PromoRateRow>(ids, overrides?.promoRates);
    if (hit) return hit;
    return live;
}

export function useLiveInstallmentPlans(ids: string[]): InstallmentPlanRow[] | undefined {
    const overrides = useContext(LivePreviewOverrideContext);
    const live = useQuery((api as any).agent.liveRows.getInstallmentPlans, ids.length > 0 ? { ids } : "skip") as InstallmentPlanRow[] | undefined;
    const hit = collect<InstallmentPlanRow>(ids, overrides?.installmentPlans);
    if (hit) return hit;
    return live;
}

export function useLiveReminders(ids: string[]): ReminderRow[] | undefined {
    const overrides = useContext(LivePreviewOverrideContext);
    const live = useQuery((api as any).agent.liveRows.getReminders, ids.length > 0 ? { ids } : "skip") as ReminderRow[] | undefined;
    const hit = collect<ReminderRow>(ids, overrides?.reminders);
    if (hit) return hit;
    return live;
}

export function useLiveProposal(proposalId: AgentProposalId | undefined): AgentProposalRow | null | undefined {
    const overrides = useContext(LivePreviewOverrideContext);
    const live = useQuery((api as any).agent.proposals.get, proposalId ? { proposalId } : "skip") as AgentProposalRow | null | undefined;
    if (overrides?.proposals && proposalId) {
        const hit = overrides.proposals[proposalId as unknown as string];
        if (hit !== undefined) return hit;
    }
    return live;
}

export type { TransactionRow, CreditCardRow, PlaidAccountRow, PromoRateRow, InstallmentPlanRow, ReminderRow, AgentProposalRow };
