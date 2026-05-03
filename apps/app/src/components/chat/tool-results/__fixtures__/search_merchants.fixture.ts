import type { AgentThreadId, ToolOutput, ToolResultComponentProps } from "../types";

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;

type MerchantBucket = {
    name: string;
    count: number;
    totalAmount: number; // dollars
    lastDate: string;
    sampleTransactionIds: string[];
};

type Preview = {
    merchants?: MerchantBucket[];
    summary?: string;
};

const base = {
    toolName: "search_merchants" as const,
    threadId: THREAD_ID,
    input: { query: "amazon", limit: 10 },
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
            "plaid:plaidTransactions:fx-amzn-1",
            "plaid:plaidTransactions:fx-amzn-2",
            "plaid:plaidTransactions:fx-amzn-3",
            "plaid:plaidTransactions:fx-amzn-4",
            "plaid:plaidTransactions:fx-amzn-5",
            "plaid:plaidTransactions:fx-amzn-6",
            "plaid:plaidTransactions:fx-amzn-7",
            "plaid:plaidTransactions:fx-amzn-8",
        ],
        preview: {
            summary: "3 merchants matching \"amazon\"",
            merchants: [
                {
                    name: "Amazon Marketplace",
                    count: 5,
                    totalAmount: 312.47,
                    lastDate: "2026-04-19",
                    sampleTransactionIds: [
                        "plaid:plaidTransactions:fx-amzn-1",
                        "plaid:plaidTransactions:fx-amzn-2",
                        "plaid:plaidTransactions:fx-amzn-3",
                    ],
                },
                {
                    name: "Amazon Prime",
                    count: 2,
                    totalAmount: 31.98,
                    lastDate: "2026-04-12",
                    sampleTransactionIds: [
                        "plaid:plaidTransactions:fx-amzn-6",
                        "plaid:plaidTransactions:fx-amzn-7",
                    ],
                },
                {
                    name: "Amazon Web Services",
                    count: 1,
                    totalAmount: 84.22,
                    lastDate: "2026-04-01",
                    sampleTransactionIds: ["plaid:plaidTransactions:fx-amzn-8"],
                },
            ],
        },
        window: { from: "2026-01-20", to: "2026-04-20" },
    },
    state: "output-available",
};

export const outputAvailableEmpty: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: [],
        preview: {
            summary: "No merchants matching \"zyx-no-match\"",
            merchants: [],
        },
        window: { from: "2026-01-20", to: "2026-04-20" },
    },
    state: "output-available",
};

export const outputError: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    errorText: "Merchant search temporarily unavailable.",
    state: "output-error",
};
