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

type Preview = { totalCount: number; summary: string };
type ListTransactionsOutput = ToolOutput<Preview> & { rows: AgentTransactionRow[] };

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function moneyFields(plaidAmountDollars: number): Pick<AgentTransactionRow, "amount" | "displayAmount" | "amountFormatted" | "direction"> {
    const displayAmount = plaidAmountDollars === 0 ? 0 : -plaidAmountDollars;
    const direction: AgentTransactionRow["direction"] = displayAmount >= 0 ? "inflow" : "outflow";
    const sign = displayAmount < 0 ? "-" : "+";
    return {
        amount: plaidAmountDollars,
        displayAmount,
        amountFormatted: `${sign}${USD.format(Math.abs(displayAmount))}`,
        direction,
    };
}

function row(
    transactionId: string,
    index: number,
    overrides: Partial<Pick<AgentTransactionRow, "date" | "merchantName" | "amount" | "category" | "pending" | "accountMask">> = {},
): AgentTransactionRow {
    const amount = overrides.amount ?? 10 + index / 100;
    return {
        transactionId,
        date: overrides.date ?? "2026-04-15",
        merchantName: overrides.merchantName ?? `Merchant ${index + 1}`,
        ...moneyFields(amount),
        category: overrides.category ?? "GENERAL_MERCHANDISE",
        pending: overrides.pending ?? false,
        accountMask: overrides.accountMask ?? "1234",
    };
}

const base = {
    toolName: "list_transactions" as const,
    threadId: THREAD_ID,
    input: { dateFrom: "2026-04-01", dateTo: "2026-04-20", limit: 25 },
};

export const inputStreaming: ToolResultComponentProps<unknown, ListTransactionsOutput> = {
    ...base,
    output: null,
    state: "input-streaming",
};

export const outputAvailable: ToolResultComponentProps<unknown, ListTransactionsOutput> = {
    ...base,
    output: {
        ids: [
            "plaid:plaidTransactions:fx-1",
            "plaid:plaidTransactions:fx-2",
            "plaid:plaidTransactions:fx-3",
        ],
        rows: [
            row("plaid:plaidTransactions:fx-1", 0, {
                date: "2026-04-20",
                merchantName: "Blue Bottle Coffee",
                amount: 7.25,
                category: "FOOD_AND_DRINK",
                pending: false,
            }),
            row("plaid:plaidTransactions:fx-2", 1, {
                date: "2026-04-18",
                merchantName: "Amazon refund",
                amount: -12.34,
                category: "GENERAL_MERCHANDISE",
                pending: false,
            }),
            row("plaid:plaidTransactions:fx-3", 2, {
                date: "2026-04-12",
                merchantName: "Statement regression path",
                amount: 8005.64,
                category: "BANK_FEES",
                pending: true,
                accountMask: "9876",
            }),
        ],
        preview: { totalCount: 3, summary: "3 dining transactions in April" },
        window: { from: "2026-04-01", to: "2026-04-20" },
    },
    state: "output-available",
};

export const outputAvailableEmpty: ToolResultComponentProps<unknown, ListTransactionsOutput> = {
    ...base,
    output: {
        ids: [],
        rows: [],
        preview: { totalCount: 0, summary: "No dining transactions" },
        window: { from: "2026-04-01", to: "2026-04-20" },
    },
    state: "output-available",
};

export const outputError: ToolResultComponentProps<unknown, ListTransactionsOutput> = {
    ...base,
    output: null,
    errorText: "Rate limit exceeded. Try again in 30 seconds.",
    state: "output-error",
};

/** 75 synthetic IDs - exercises client-side pagination (50 per page) in `/dev/tool-results/list_transactions`. */
export const outputAvailableManyRows: ToolResultComponentProps<unknown, ListTransactionsOutput> = {
    ...base,
    input: { dateFrom: "2026-04-01", dateTo: "2026-04-30", limit: 75 },
    output: {
        ids: Array.from(
            { length: 75 },
            (_, i) => `plaid:plaidTransactions:fx-many-${String(i).padStart(3, "0")}`,
        ),
        rows: Array.from({ length: 50 }, (_, i) =>
            row(`plaid:plaidTransactions:fx-many-${String(i).padStart(3, "0")}`, i, {
                date: `2026-04-${String((i % 30) + 1).padStart(2, "0")}`,
                amount: i % 9 === 0 ? -(20 + i / 100) : 20 + i / 100,
                pending: i === 0,
            }),
        ),
        preview: { totalCount: 75, summary: "75 transactions (pagination harness)" },
        window: { from: "2026-04-01", to: "2026-04-30" },
    },
    state: "output-available",
};
