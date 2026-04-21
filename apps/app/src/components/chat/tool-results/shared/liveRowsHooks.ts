"use client";

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
// When the queries land, replace each stub body with:
//
//   import { useQuery } from "convex-helpers/react/cache/hooks";
//   import { api } from "@convex/_generated/api";
//   return useQuery(api.transactions.queries.getManyByIds, ids.length > 0 ? { ids } : "skip");
//
// The type signatures below are intentionally narrow — when the queries land
// the callers get the right shape back automatically.
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

export function useLiveTransactions(_ids: string[]): TransactionRow[] | undefined {
    // CR-5: api.transactions.queries.getManyByIds pending from W2/W5 plan.
    return undefined;
}

export function useLiveCreditCards(_ids: Array<Id<"creditCards">>): CreditCardRow[] | undefined {
    // CR-5: api.creditCards.queries.getMany pending from W2 plan.
    return undefined;
}

export function useLivePlaidAccounts(_ids: string[]): PlaidAccountRow[] | undefined {
    // CR-5: api.plaidAccounts.queries.getManyByIds pending from W2 plan.
    return undefined;
}

export function useLivePromoRates(_ids: string[]): PromoRateRow[] | undefined {
    // CR-5: api.promoRates.queries.getManyByIds pending from W5 plan.
    return undefined;
}

export function useLiveInstallmentPlans(_ids: string[]): InstallmentPlanRow[] | undefined {
    // CR-5: api.installmentPlans.queries.getManyByIds pending from W5 plan.
    return undefined;
}

export function useLiveReminders(_ids: string[]): ReminderRow[] | undefined {
    // CR-5: api.reminders.queries.getManyByIds pending from W2 plan.
    return undefined;
}

export function useLiveProposal(_proposalId: AgentProposalId | undefined): AgentProposalRow | null | undefined {
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
