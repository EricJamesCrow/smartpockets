import type { AgentThreadId, ToolOutput, ToolResultComponentProps } from "../types";

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;

type Preview = {
    buckets?: Array<{ from: string; to: string; amount: number }>;
    totalAmount?: number;
    summary?: string;
};

const base = {
    toolName: "get_spend_over_time" as const,
    threadId: THREAD_ID,
    input: { window: { from: "2026-03-01", to: "2026-04-20", granularity: "week" } },
};

export const inputStreaming: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    state: "input-streaming",
};

export const outputAvailable: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: Array.from({ length: 12 }, (_, i) => `plaid:plaidTransactions:fx-time-${i}`),
        preview: {
            buckets: [
                { from: "2026-03-02", to: "2026-03-08", amount: 410 },
                { from: "2026-03-09", to: "2026-03-15", amount: 552 },
                { from: "2026-03-16", to: "2026-03-22", amount: 378 },
                { from: "2026-03-23", to: "2026-03-29", amount: 612 },
                { from: "2026-03-30", to: "2026-04-05", amount: 298 },
                { from: "2026-04-06", to: "2026-04-12", amount: 745 },
                { from: "2026-04-13", to: "2026-04-19", amount: 521 },
            ],
            totalAmount: 3516,
            summary: "Weekly spend, March to April",
        },
        window: { from: "2026-03-01", to: "2026-04-20", granularity: "week" },
    },
    state: "output-available",
};

export const outputAvailableEmpty: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: [],
        preview: { buckets: [], totalAmount: 0, summary: "No spend in window" },
        window: { from: "2026-03-01", to: "2026-04-20", granularity: "week" },
    },
    state: "output-available",
};

export const outputError: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    errorText: "Spend-over-time data unavailable.",
    state: "output-error",
};
