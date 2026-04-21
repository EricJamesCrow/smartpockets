import type { AgentThreadId, ToolOutput, ToolResultComponentProps } from "../types";

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;

type ReminderPreview = {
    id: string;
    title: string;
    dueAt: number;
    notes?: string | null;
    isDone: boolean;
    relatedResourceType: "creditCard" | "promoRate" | "installmentPlan" | "transaction" | "none";
    relatedResourceId?: string | null;
};

type Preview = { reminders?: ReminderPreview[]; summary?: string };

const now = new Date("2026-04-20T12:00:00Z").getTime();
const days = (n: number) => now + n * 24 * 60 * 60 * 1000;

const base = {
    toolName: "list_reminders" as const,
    threadId: THREAD_ID,
    input: { includeDone: false },
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
            "reminders:fx-1",
            "reminders:fx-2",
            "reminders:fx-3",
            "reminders:fx-4",
            "reminders:fx-5",
        ],
        preview: {
            summary: "5 reminders on track",
            reminders: [
                {
                    id: "reminders:fx-1",
                    title: "Pay Chase statement",
                    dueAt: days(-2),
                    notes: "Minimum $125",
                    isDone: false,
                    relatedResourceType: "creditCard",
                    relatedResourceId: "creditCards:fx-chase",
                },
                {
                    id: "reminders:fx-2",
                    title: "Transfer BT balance",
                    dueAt: days(0),
                    isDone: false,
                    relatedResourceType: "promoRate",
                },
                {
                    id: "reminders:fx-3",
                    title: "Book Amex travel credit",
                    dueAt: days(3),
                    notes: "Airline fee credit expires end of month",
                    isDone: false,
                    relatedResourceType: "creditCard",
                    relatedResourceId: "creditCards:fx-amex",
                },
                {
                    id: "reminders:fx-4",
                    title: "Review spend vs budget",
                    dueAt: days(14),
                    isDone: false,
                    relatedResourceType: "none",
                },
                {
                    id: "reminders:fx-5",
                    title: "Dispute Chase fee",
                    dueAt: days(-6),
                    notes: "Confirmed resolved",
                    isDone: true,
                    relatedResourceType: "transaction",
                },
            ],
        },
    },
    state: "output-available",
};

export const outputAvailableEmpty: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: [],
        preview: { reminders: [], summary: "No reminders yet" },
    },
    state: "output-available",
};

export const outputError: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    errorText: "Reminders unavailable.",
    state: "output-error",
};
