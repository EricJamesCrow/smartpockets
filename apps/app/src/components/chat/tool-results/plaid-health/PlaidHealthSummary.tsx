"use client";

import Link from "next/link";

import { ToolCardShell } from "../shared/ToolCardShell";
import type { ToolOutput, ToolResultComponentProps } from "../types";
import { PlaidHealthSummarySkeleton } from "./PlaidHealthSummarySkeleton";

type ItemState = "syncing" | "ready" | "error" | "re-consent-required";
type RecommendedAction =
    | "reconnect"
    | "reconnect_for_new_accounts"
    | "wait"
    | "contact_support"
    | null;

type ItemHealthRow = {
    plaidItemId: string;
    institutionName: string;
    state: ItemState;
    recommendedAction: RecommendedAction;
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

type Severity = "healthy" | "syncing" | "needs-reconnect" | "errored";

type SeverityVisual = {
    label: string;
    badgeClass: string;
    dotClass: string;
};

const SEVERITY_VISUALS: Record<Severity, SeverityVisual> = {
    healthy: {
        label: "Healthy",
        badgeClass: "bg-utility-success-50 text-utility-success-700",
        dotClass: "bg-utility-success-500",
    },
    syncing: {
        label: "Syncing",
        badgeClass: "bg-utility-blue-50 text-utility-blue-700",
        dotClass: "bg-utility-blue-500",
    },
    "needs-reconnect": {
        label: "Reconnect",
        badgeClass: "bg-utility-warning-50 text-utility-warning-700",
        dotClass: "bg-utility-warning-500",
    },
    errored: {
        label: "Errored",
        badgeClass: "bg-utility-error-50 text-utility-error-700",
        dotClass: "bg-utility-error-500",
    },
};

function classifySeverity(item: ItemHealthRow): Severity {
    if (item.state === "error") return "errored";
    if (item.state === "re-consent-required") return "needs-reconnect";
    if (item.state === "syncing") return "syncing";
    if (item.recommendedAction === "reconnect_for_new_accounts") return "needs-reconnect";
    return "healthy";
}

function formatRelativeSync(item: ItemHealthRow): string {
    if (item.lastSyncedAt == null) return "Never synced";
    const days = item.daysSinceLastSync;
    if (days == null) {
        const date = new Date(item.lastSyncedAt);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    if (days <= 0) return "Synced today";
    if (days === 1) return "Synced yesterday";
    if (days < 7) return `Synced ${days} days ago`;
    if (days < 14) return "Synced last week";
    if (days < 60) return `Synced ${Math.floor(days / 7)} weeks ago`;
    return `Synced ${Math.floor(days / 30)} months ago`;
}

function recommendedActionCopy(action: RecommendedAction): string | null {
    switch (action) {
        case "reconnect":
            return "Reconnect to resume syncing";
        case "reconnect_for_new_accounts":
            return "Reconnect to import new accounts";
        case "wait":
            return "Plaid is recovering - no action needed";
        case "contact_support":
            return "Contact support to resolve";
        default:
            return null;
    }
}

export function PlaidHealthSummary(
    props: ToolResultComponentProps<unknown, ToolOutput<Preview>>,
) {
    const { output, state } = props;

    if (state === "input-streaming" || !output) {
        return <PlaidHealthSummarySkeleton />;
    }

    const items = output.preview.items ?? [];
    const title = "Bank connections";
    const subtitle = output.preview.summary ?? undefined;

    if (items.length === 0) {
        return (
            <ToolCardShell title={title}>
                <p className="text-sm text-tertiary">
                    No bank connections linked yet.{" "}
                    <Link
                        href="/settings/institutions"
                        className="text-utility-brand-700 font-medium hover:underline"
                    >
                        Link a bank
                    </Link>
                    .
                </p>
            </ToolCardShell>
        );
    }

    const needsAttention = items.some((i) => classifySeverity(i) !== "healthy");

    return (
        <ToolCardShell
            title={title}
            subtitle={subtitle}
            action={
                needsAttention ? (
                    <Link
                        href="/settings/institutions"
                        className="text-utility-brand-700 shrink-0 text-xs font-medium hover:underline"
                    >
                        Manage
                    </Link>
                ) : undefined
            }
        >
            <ul className="divide-y divide-secondary">
                {items.map((item) => {
                    const severity = classifySeverity(item);
                    const visual = SEVERITY_VISUALS[severity];
                    const action = recommendedActionCopy(item.recommendedAction);
                    return (
                        <li key={item.plaidItemId} className="py-3 first:pt-0 last:pb-0">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span
                                            aria-hidden="true"
                                            className={`size-1.5 shrink-0 rounded-full ${visual.dotClass}`}
                                        />
                                        <p className="truncate text-sm font-medium text-primary">
                                            {item.institutionName}
                                        </p>
                                    </div>
                                    <p className="mt-0.5 text-xs text-tertiary">
                                        {formatRelativeSync(item)}
                                    </p>
                                    {action && (
                                        <p className="mt-1 text-xs text-secondary">{action}</p>
                                    )}
                                    {item.state === "error" && item.errorMessage && (
                                        <p className="text-utility-error-700 mt-1 text-xs">
                                            {item.errorCode ? `${item.errorCode}: ` : ""}
                                            {item.errorMessage}
                                        </p>
                                    )}
                                </div>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${visual.badgeClass}`}
                                >
                                    {visual.label}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </ToolCardShell>
    );
}
