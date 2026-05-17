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
};

type MerchantBucket = {
    name: string;
    count: number;
    /** Plaid convention dollars: positive = net outflow, negative = net inflow. */
    totalAmount: number;
    /** Human convention dollars: positive = money in, negative = money out. */
    displayTotalAmount: number;
    lastDate: string;
    sampleTransactionIds: string[];
};

type Preview = {
    merchants?: MerchantBucket[];
    summary?: string;
};
type SearchMerchantsOutput = ToolOutput<Preview> & { rows: AgentTransactionRow[] };

const base = {
    toolName: "search_merchants" as const,
    threadId: THREAD_ID,
    input: { query: "amazon", dateFrom: "2026-01-20", dateTo: "2026-04-20", limit: 10 },
};

const rows: AgentTransactionRow[] = [
    {
        transactionId: "plaid:plaidTransactions:fx-amzn-1",
        merchantName: "Amazon Marketplace",
        date: "2026-04-19",
        amount: 112.47,
        displayAmount: -112.47,
        amountFormatted: "-$112.47",
        direction: "outflow",
        category: "GENERAL_MERCHANDISE",
        pending: false,
        accountMask: "1234",
    },
    {
        transactionId: "plaid:plaidTransactions:fx-amzn-2",
        merchantName: "Amazon Marketplace",
        date: "2026-04-18",
        amount: -28.32,
        displayAmount: 28.32,
        amountFormatted: "+$28.32",
        direction: "inflow",
        category: "GENERAL_MERCHANDISE",
        pending: false,
        accountMask: "1234",
    },
    {
        transactionId: "plaid:plaidTransactions:fx-amzn-6",
        merchantName: "Amazon Prime",
        date: "2026-04-12",
        amount: 15.99,
        displayAmount: -15.99,
        amountFormatted: "-$15.99",
        direction: "outflow",
        category: "ENTERTAINMENT",
        pending: false,
        accountMask: "9876",
    },
    {
        transactionId: "plaid:plaidTransactions:fx-amzn-3",
        merchantName: "Amazon Marketplace",
        date: "2026-04-10",
        amount: 88,
        displayAmount: -88,
        amountFormatted: "-$88.00",
        direction: "outflow",
        category: "GENERAL_MERCHANDISE",
        pending: false,
        accountMask: "1234",
    },
    {
        transactionId: "plaid:plaidTransactions:fx-amzn-7",
        merchantName: "Amazon Prime",
        date: "2026-04-08",
        amount: 15.99,
        displayAmount: -15.99,
        amountFormatted: "-$15.99",
        direction: "outflow",
        category: "ENTERTAINMENT",
        pending: false,
        accountMask: "9876",
    },
    {
        transactionId: "plaid:plaidTransactions:fx-amzn-8",
        merchantName: "Amazon Web Services",
        date: "2026-04-01",
        amount: 84.22,
        displayAmount: -84.22,
        amountFormatted: "-$84.22",
        direction: "outflow",
        category: "GENERAL_SERVICES",
        pending: true,
        accountMask: "9876",
    },
    {
        transactionId: "plaid:plaidTransactions:fx-amzn-4",
        merchantName: "Amazon Marketplace",
        date: "2026-03-30",
        amount: 75,
        displayAmount: -75,
        amountFormatted: "-$75.00",
        direction: "outflow",
        category: "GENERAL_MERCHANDISE",
        pending: false,
        accountMask: "1234",
    },
    {
        transactionId: "plaid:plaidTransactions:fx-amzn-5",
        merchantName: "Amazon Marketplace",
        date: "2026-03-21",
        amount: 65.32,
        displayAmount: -65.32,
        amountFormatted: "-$65.32",
        direction: "outflow",
        category: "GENERAL_MERCHANDISE",
        pending: false,
        accountMask: "1234",
    },
];

export const inputStreaming: ToolResultComponentProps<unknown, SearchMerchantsOutput> = {
    ...base,
    output: null,
    state: "input-streaming",
};

export const outputAvailable: ToolResultComponentProps<unknown, SearchMerchantsOutput> = {
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
        rows,
        preview: {
            summary: "3 merchants matching \"amazon\"",
            merchants: [
                {
                    name: "Amazon Marketplace",
                    count: 5,
                    totalAmount: 312.47,
                    displayTotalAmount: -312.47,
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
                    displayTotalAmount: -31.98,
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
                    displayTotalAmount: -84.22,
                    lastDate: "2026-04-01",
                    sampleTransactionIds: ["plaid:plaidTransactions:fx-amzn-8"],
                },
            ],
        },
        window: { from: "2026-01-20", to: "2026-04-20" },
    },
    state: "output-available",
};

export const outputAvailableEmpty: ToolResultComponentProps<unknown, SearchMerchantsOutput> = {
    ...base,
    input: { query: "zyx-no-match", dateFrom: "2026-01-20", dateTo: "2026-04-20", limit: 10 },
    output: {
        ids: [],
        rows: [],
        preview: {
            summary: "No merchants matching \"zyx-no-match\"",
            merchants: [],
        },
        window: { from: "2026-01-20", to: "2026-04-20" },
    },
    state: "output-available",
};

export const outputError: ToolResultComponentProps<unknown, SearchMerchantsOutput> = {
    ...base,
    output: null,
    errorText: "Merchant search temporarily unavailable.",
    state: "output-error",
};
