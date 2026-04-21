import type { AgentThreadId, ToolOutput, ToolResultComponentProps } from "../types";

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;

type Preview = { summary?: string };

const base = {
    toolName: "get_upcoming_statements" as const,
    threadId: THREAD_ID,
    input: { windowDays: 30 },
};

export const inputStreaming: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    state: "input-streaming",
};

export const outputAvailable: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: ["creditCards:fx-chase", "creditCards:fx-citi"],
        preview: { summary: "2 statements closing in the next 14 days" },
        window: { from: "2026-04-20", to: "2026-05-04" },
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
    errorText: "Upcoming statements unavailable.",
    state: "output-error",
};
