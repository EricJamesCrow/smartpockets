"use client";

import { ToolCardShell } from "../shared/ToolCardShell";

export function SpendOverTimeChartSkeleton() {
    return (
        <ToolCardShell title="Spend over time">
            <div className="h-48 w-full animate-pulse rounded-lg bg-secondary" />
        </ToolCardShell>
    );
}
