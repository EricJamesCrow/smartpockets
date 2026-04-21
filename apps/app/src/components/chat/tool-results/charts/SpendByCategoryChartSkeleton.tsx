"use client";

import { ShimmerBar } from "../shared/Skeletons";
import { ToolCardShell } from "../shared/ToolCardShell";

export function SpendByCategoryChartSkeleton() {
    return (
        <ToolCardShell title="Spend by category">
            <div className="flex items-center gap-4">
                <div className="h-40 w-40 shrink-0 animate-pulse rounded-full bg-secondary" />
                <div className="flex-1 space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="h-3 w-3 animate-pulse rounded-full bg-secondary" />
                            <ShimmerBar className="h-3 flex-1" />
                        </div>
                    ))}
                </div>
            </div>
        </ToolCardShell>
    );
}
