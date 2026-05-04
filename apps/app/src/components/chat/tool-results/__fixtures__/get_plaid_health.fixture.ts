import type { AgentThreadId, ToolOutput, ToolResultComponentProps } from "../types";

const THREAD_ID = "fx-thread" as unknown as AgentThreadId;

type ItemHealthRow = {
    plaidItemId: string;
    institutionName: string;
    state: "syncing" | "ready" | "error" | "re-consent-required";
    recommendedAction:
        | "reconnect"
        | "reconnect_for_new_accounts"
        | "wait"
        | "contact_support"
        | null;
    reasonCode?: string;
    isActive?: boolean;
    lastSyncedAt: number | null;
    daysSinceLastSync: number | null;
    errorCode: string | null;
    errorMessage: string | null;
    circuitState?: "closed" | "open" | "half_open";
    consecutiveFailures?: number;
};

type Preview = {
    items?: ItemHealthRow[];
    summary?: string;
};

const NOW = Date.UTC(2026, 4, 3); // 2026-05-03
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const base = {
    toolName: "get_plaid_health" as const,
    threadId: THREAD_ID,
    input: {},
};

export const inputStreaming: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    state: "input-streaming",
};

export const outputAvailableHealthy: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: ["plaid:plaidItems:chase-1", "plaid:plaidItems:fidelity-1"],
        preview: {
            summary: "2 healthy",
            items: [
                {
                    plaidItemId: "plaid:plaidItems:chase-1",
                    institutionName: "Chase",
                    state: "ready",
                    recommendedAction: null,
                    reasonCode: "ok",
                    isActive: true,
                    lastSyncedAt: NOW - 6 * HOUR,
                    daysSinceLastSync: 0,
                    errorCode: null,
                    errorMessage: null,
                    circuitState: "closed",
                    consecutiveFailures: 0,
                },
                {
                    plaidItemId: "plaid:plaidItems:fidelity-1",
                    institutionName: "Fidelity",
                    state: "ready",
                    recommendedAction: null,
                    reasonCode: "ok",
                    isActive: true,
                    lastSyncedAt: NOW - 18 * HOUR,
                    daysSinceLastSync: 0,
                    errorCode: null,
                    errorMessage: null,
                    circuitState: "closed",
                    consecutiveFailures: 0,
                },
            ],
        },
    },
    state: "output-available",
};

export const outputAvailableMixed: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: [
            "plaid:plaidItems:chase-broken",
            "plaid:plaidItems:wells-reconsent",
            "plaid:plaidItems:amex-syncing",
            "plaid:plaidItems:citi-ok",
        ],
        preview: {
            summary: "1 healthy, 1 syncing, 1 needs reconnect, 1 errored",
            items: [
                {
                    plaidItemId: "plaid:plaidItems:chase-broken",
                    institutionName: "Chase",
                    state: "error",
                    recommendedAction: "contact_support",
                    reasonCode: "internal_error",
                    isActive: true,
                    lastSyncedAt: NOW - 9 * DAY,
                    daysSinceLastSync: 9,
                    errorCode: "INTERNAL_SERVER_ERROR",
                    errorMessage: "Plaid returned an unexpected error syncing this item.",
                    circuitState: "open",
                    consecutiveFailures: 5,
                },
                {
                    plaidItemId: "plaid:plaidItems:wells-reconsent",
                    institutionName: "Wells Fargo",
                    state: "re-consent-required",
                    recommendedAction: "reconnect",
                    reasonCode: "item_login_required",
                    isActive: true,
                    lastSyncedAt: NOW - 4 * DAY,
                    daysSinceLastSync: 4,
                    errorCode: "ITEM_LOGIN_REQUIRED",
                    errorMessage: "The user's credentials are no longer valid.",
                    circuitState: "closed",
                    consecutiveFailures: 1,
                },
                {
                    plaidItemId: "plaid:plaidItems:amex-syncing",
                    institutionName: "American Express",
                    state: "syncing",
                    recommendedAction: "wait",
                    reasonCode: "syncing",
                    isActive: true,
                    lastSyncedAt: NOW - 2 * HOUR,
                    daysSinceLastSync: 0,
                    errorCode: null,
                    errorMessage: null,
                    circuitState: "closed",
                    consecutiveFailures: 0,
                },
                {
                    plaidItemId: "plaid:plaidItems:citi-ok",
                    institutionName: "Citibank",
                    state: "ready",
                    recommendedAction: null,
                    reasonCode: "ok",
                    isActive: true,
                    lastSyncedAt: NOW - 12 * HOUR,
                    daysSinceLastSync: 0,
                    errorCode: null,
                    errorMessage: null,
                    circuitState: "closed",
                    consecutiveFailures: 0,
                },
            ],
        },
    },
    state: "output-available",
};

export const outputAvailableNewAccounts: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: {
        ids: ["plaid:plaidItems:chase-new-accts"],
        preview: {
            summary: "1 needs reconnect",
            items: [
                {
                    plaidItemId: "plaid:plaidItems:chase-new-accts",
                    institutionName: "Chase",
                    state: "ready",
                    recommendedAction: "reconnect_for_new_accounts",
                    reasonCode: "new_accounts_available",
                    isActive: true,
                    lastSyncedAt: NOW - 3 * HOUR,
                    daysSinceLastSync: 0,
                    errorCode: null,
                    errorMessage: null,
                    circuitState: "closed",
                    consecutiveFailures: 0,
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
        preview: {
            summary: "No bank connections linked yet",
            items: [],
        },
    },
    state: "output-available",
};

export const outputError: ToolResultComponentProps<unknown, ToolOutput<Preview>> = {
    ...base,
    output: null,
    errorText: "Plaid health check temporarily unavailable.",
    state: "output-error",
};
