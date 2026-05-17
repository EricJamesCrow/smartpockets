import type { AgentThreadId, ToolOutput, ToolResultComponentProps } from "../types";

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;

type AgentTransactionRow = {
    transactionId: string;
    date: string;
    merchantName: string;
    /** Plaid convention dollars: positive = outflow, negative = inflow. */
    amount: number;
    /** Human convention dollars: positive = money in, negative = money out. */
    displayAmount: number;
    /** Pre-formatted human-convention amount. Agent should copy verbatim. */
    amountFormatted: string;
    direction: "inflow" | "outflow";
    category?: string;
    pending: boolean;
    accountMask?: string;
    notes?: string;
    isReviewed?: boolean;
};

type Preview = {
    summary: string;
};
type GetTransactionDetailOutput = ToolOutput<Preview> & { row: AgentTransactionRow | null };

const base = {
    toolName: "get_transaction_detail" as const,
    threadId: THREAD_ID,
    input: { plaidTransactionId: "plaid:plaidTransactions:fx-1" },
};

export const inputStreaming: ToolResultComponentProps<unknown, GetTransactionDetailOutput> = {
    ...base,
    output: null,
    state: "input-streaming",
};

export const outputAvailable: ToolResultComponentProps<unknown, GetTransactionDetailOutput> = {
    ...base,
    output: {
        ids: ["plaid:plaidTransactions:fx-1"],
        row: {
            transactionId: "plaid:plaidTransactions:fx-1",
            merchantName: "Blue Bottle Coffee",
            date: "2026-04-15",
            amount: 7.25,
            displayAmount: -7.25,
            amountFormatted: "-$7.25",
            direction: "outflow",
            category: "FOOD_AND_DRINK",
            pending: false,
            accountMask: "1234",
            notes: "Morning coffee",
            isReviewed: true,
        },
        preview: { summary: "Transaction located" },
    },
    state: "output-available",
};

export const outputAvailableEmpty: ToolResultComponentProps<unknown, GetTransactionDetailOutput> = {
    ...base,
    input: { plaidTransactionId: "plaid:plaidTransactions:fx-missing" },
    output: {
        ids: [],
        row: null,
        preview: { summary: "Transaction not found for this user" },
    },
    state: "output-available",
};

export const outputError: ToolResultComponentProps<unknown, GetTransactionDetailOutput> = {
    ...base,
    output: null,
    errorText: "Transaction detail temporarily unavailable.",
    state: "output-error",
};
