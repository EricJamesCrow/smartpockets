import type { Id } from "@convex/_generated/dataModel";

import type { AgentThreadId, ToolOutput, ToolResultComponentProps } from "../types";

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;
const CARD_ID = "creditCards:fx-chase" as unknown as Id<"creditCards">;

type PromoPreview = {
    id: string;
    cardId: Id<"creditCards">;
    cardName?: string;
    kind: string;
    apr: number;
    startDate: string;
    endDate: string;
    balance?: number;
    note?: string;
};

type Preview = { promos?: PromoPreview[]; summary?: string };

const base = {
    toolName: "list_deferred_interest_promos" as const,
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
        ids: ["promoRates:fx-1", "promoRates:fx-2", "promoRates:fx-3"],
        preview: {
            summary: "3 active promos on your cards",
            promos: [
                {
                    id: "promoRates:fx-1",
                    cardId: CARD_ID,
                    cardName: "Chase Sapphire Reserve",
                    kind: "Balance transfer",
                    apr: 0,
                    startDate: "2025-11-15",
                    endDate: "2026-05-15",
                    balance: 2450,
                },
                {
                    id: "promoRates:fx-2",
                    cardId: CARD_ID,
                    cardName: "Amex Platinum",
                    kind: "Intro purchase APR",
                    apr: 0,
                    startDate: "2026-01-01",
                    endDate: "2026-07-01",
                    balance: 890,
                },
                {
                    id: "promoRates:fx-3",
                    cardId: CARD_ID,
                    cardName: "Citi Double Cash",
                    kind: "Balance transfer",
                    apr: 0,
                    startDate: "2025-08-10",
                    endDate: "2026-04-30",
                    balance: 4200,
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
        preview: { promos: [], summary: "No active promos" },
    },
    state: "output-available",
};

export const outputError: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    errorText: "Promo data temporarily unavailable.",
    state: "output-error",
};
