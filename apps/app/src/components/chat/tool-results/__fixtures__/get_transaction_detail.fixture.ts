import type { AgentThreadId, ToolOutput, ToolResultComponentProps } from "../types";

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;

type Preview = {
    merchantName?: string;
    amount?: number;
    date?: string;
    categoryPrimary?: string | null;
};

const base = {
    toolName: "get_transaction_detail" as const,
    threadId: THREAD_ID,
    input: { transactionId: "plaid:plaidTransactions:fx-1" },
};

export const inputStreaming: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    state: "input-streaming",
};

export const outputAvailable: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: ["plaid:plaidTransactions:fx-1"],
        preview: {
            merchantName: "Blue Bottle Coffee",
            amount: 7250,
            date: "2026-04-15",
            categoryPrimary: "Food and Drink",
        },
    },
    state: "output-available",
};

export const outputAvailableEmpty: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: ["plaid:plaidTransactions:fx-missing"],
        preview: {},
    },
    state: "output-available",
};

export const outputError: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    errorText: "Transaction detail temporarily unavailable.",
    state: "output-error",
};
