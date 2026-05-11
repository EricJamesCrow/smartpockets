import type { AgentThreadId, ToolOutput, ToolResultComponentProps } from "../types";

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;

type Preview = { totalCount: number; summary: string };

const base = {
    toolName: "list_transactions" as const,
    threadId: THREAD_ID,
    input: { window: { from: "2026-04-01", to: "2026-04-20" }, category: "Dining" },
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
            "plaid:plaidTransactions:fx-1",
            "plaid:plaidTransactions:fx-2",
            "plaid:plaidTransactions:fx-3",
        ],
        preview: { totalCount: 3, summary: "3 dining transactions in April" },
        window: { from: "2026-04-01", to: "2026-04-20" },
    },
    state: "output-available",
};

export const outputAvailableEmpty: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: [],
        preview: { totalCount: 0, summary: "No dining transactions" },
        window: { from: "2026-04-01", to: "2026-04-20" },
    },
    state: "output-available",
};

export const outputError: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    errorText: "Rate limit exceeded. Try again in 30 seconds.",
    state: "output-error",
};

/** 75 synthetic IDs — exercises client-side pagination (50 per page) in `/dev/tool-results/list_transactions`. */
export const outputAvailableManyRows: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: Array.from(
            { length: 75 },
            (_, i) => `plaid:plaidTransactions:fx-many-${String(i).padStart(3, "0")}`,
        ),
        preview: { totalCount: 75, summary: "75 transactions (pagination harness)" },
        window: { from: "2026-04-01", to: "2026-04-30" },
    },
    state: "output-available",
};
