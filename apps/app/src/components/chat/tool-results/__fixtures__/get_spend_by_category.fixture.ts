import type { AgentThreadId, ToolOutput, ToolResultComponentProps } from "../types";

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;

type Preview = {
    buckets?: Array<{ category: string; amount: number }>;
    totalAmount?: number;
    summary?: string;
};

const base = {
    toolName: "get_spend_by_category" as const,
    threadId: THREAD_ID,
    input: { window: { from: "2026-04-01", to: "2026-04-20" } },
};

export const inputStreaming: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    state: "input-streaming",
};

export const outputAvailable: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: [
            "plaid:plaidTransactions:fx-c1",
            "plaid:plaidTransactions:fx-c2",
            "plaid:plaidTransactions:fx-c3",
            "plaid:plaidTransactions:fx-c4",
            "plaid:plaidTransactions:fx-c5",
        ],
        preview: {
            buckets: [
                { category: "Food and Drink", amount: 542.21 },
                { category: "Travel", amount: 310.08 },
                { category: "Shopping", amount: 189.75 },
                { category: "Transportation", amount: 72.4 },
            ],
            totalAmount: 1114.44,
            summary: "Spend by category, last 20 days",
        },
        window: { from: "2026-04-01", to: "2026-04-20" },
    },
    state: "output-available",
};

export const outputAvailableEmpty: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: [],
        preview: { buckets: [], totalAmount: 0, summary: "Spend by category" },
        window: { from: "2026-04-01", to: "2026-04-20" },
    },
    state: "output-available",
};

export const outputError: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    errorText: "Spending breakdown unavailable.",
    state: "output-error",
};
