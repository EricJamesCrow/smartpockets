import type { Id } from "@convex/_generated/dataModel";

import type { AgentThreadId, ToolOutput, ToolResultComponentProps } from "../types";

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;
const CARD_ID = "creditCards:fx-chase" as unknown as Id<"creditCards">;

type PlanPreview = {
    id: string;
    cardId: Id<"creditCards">;
    cardName?: string;
    merchantName: string;
    totalAmount: number;
    monthlyPayment: number;
    totalPayments: number;
    remainingPayments: number;
    startDate: string;
    endDate: string;
};

type Preview = { plans?: PlanPreview[]; summary?: string };

const base = {
    toolName: "list_installment_plans" as const,
    threadId: THREAD_ID,
    input: {},
};

export const inputStreaming: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    state: "input-streaming",
};

export const outputAvailable: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: ["installmentPlans:fx-1", "installmentPlans:fx-2", "installmentPlans:fx-3"],
        preview: {
            summary: "3 active installment plans",
            plans: [
                {
                    id: "installmentPlans:fx-1",
                    cardId: CARD_ID,
                    cardName: "Chase Sapphire Reserve",
                    merchantName: "Apple Card Monthly Installments",
                    totalAmount: 1200,
                    monthlyPayment: 100,
                    totalPayments: 12,
                    remainingPayments: 8,
                    startDate: "2026-01-15",
                    endDate: "2027-01-15",
                },
                {
                    id: "installmentPlans:fx-2",
                    cardId: CARD_ID,
                    cardName: "Citi Double Cash",
                    merchantName: "Peloton Financing",
                    totalAmount: 2200,
                    monthlyPayment: 92,
                    totalPayments: 24,
                    remainingPayments: 22,
                    startDate: "2026-03-01",
                    endDate: "2028-03-01",
                },
                {
                    id: "installmentPlans:fx-3",
                    cardId: CARD_ID,
                    cardName: "Amex Platinum",
                    merchantName: "Amex Plan It (TV Purchase)",
                    totalAmount: 900,
                    monthlyPayment: 75,
                    totalPayments: 12,
                    remainingPayments: 10,
                    startDate: "2026-02-15",
                    endDate: "2027-02-15",
                },
            ],
        },
    },
    state: "output-available",
};

export const outputAvailableEmpty: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: [],
        preview: { plans: [], summary: "No active installment plans" },
    },
    state: "output-available",
};

export const outputError: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    errorText: "Installment plan data unavailable.",
    state: "output-error",
};
