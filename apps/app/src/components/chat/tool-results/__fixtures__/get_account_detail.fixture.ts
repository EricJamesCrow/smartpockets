import type { AgentThreadId, ToolOutput, ToolResultComponentProps } from "../types";

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;

type Preview = { totalBalance?: number; institutionCount?: number; summary?: string };

const base = {
    toolName: "get_account_detail" as const,
    threadId: THREAD_ID,
    input: { accountId: "plaid:plaidAccounts:chase-checking" },
};

export const inputStreaming: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    state: "input-streaming",
};

export const outputAvailable: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: ["plaid:plaidAccounts:chase-checking"],
        preview: { totalBalance: 5230.12, institutionCount: 1 },
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
    errorText: "Account not found.",
    state: "output-error",
};
