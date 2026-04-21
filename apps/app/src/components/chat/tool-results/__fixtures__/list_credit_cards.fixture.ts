import type { AgentThreadId, ToolOutput, ToolResultComponentProps } from "../types";

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;

type Preview = { summary?: string };

const base = {
    toolName: "list_credit_cards" as const,
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
        ids: ["creditCards:fx-chase", "creditCards:fx-amex", "creditCards:fx-citi"],
        preview: { summary: "3 active credit cards" },
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
    errorText: "Unable to load cards right now.",
    state: "output-error",
};
