import type { AgentThreadId, ToolOutput, ToolResultComponentProps } from "../types";

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;

type Preview = { totalBalance?: number; institutionCount?: number; summary?: string };

const base = {
    toolName: "list_accounts" as const,
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
        ids: [
            "plaid:plaidAccounts:chase-checking",
            "plaid:plaidAccounts:chase-savings",
            "plaid:plaidAccounts:chase-credit",
            "plaid:plaidAccounts:amex-checking",
            "plaid:plaidAccounts:amex-savings",
            "plaid:plaidAccounts:amex-plat",
        ],
        preview: { totalBalance: 12450.32, institutionCount: 2, summary: "6 accounts across 2 institutions" },
    },
    state: "output-available",
};

export const outputAvailableEmpty: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: { ids: [], preview: {} },
    state: "output-available",
};

export const outputError: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    errorText: "Plaid connection is reauth-required.",
    state: "output-error",
};
