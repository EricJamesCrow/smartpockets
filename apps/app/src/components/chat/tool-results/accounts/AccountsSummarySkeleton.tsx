"use client";

import { ShimmerBar } from "../shared/Skeletons";
import { ToolCardShell } from "../shared/ToolCardShell";

/**
 * Mirrors the institution-grouped card layout used by `AccountsSummary` so the
 * perceived layout shift between skeleton and hydrated rows is minimal.
 */
export function AccountsSummarySkeleton() {
    return (
        <ToolCardShell title="Accounts">
            <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, groupIndex) => (
                    <div key={groupIndex} className="rounded-xl border border-secondary bg-primary">
                        <div className="flex items-center gap-3 border-b border-secondary px-4 py-3">
                            <div className="size-12 shrink-0 animate-pulse rounded-lg bg-tertiary/30" />
                            <div className="flex-1 space-y-1.5">
                                <ShimmerBar className="h-3 w-2/5" />
                                <ShimmerBar className="h-2.5 w-16" />
                            </div>
                            <ShimmerBar className="h-4 w-20 shrink-0" />
                        </div>
                        <div className="divide-y divide-secondary px-4">
                            {Array.from({ length: 2 }).map((_, rowIndex) => (
                                <div key={rowIndex} className="flex items-center gap-3 py-2.5">
                                    <div className="size-9 shrink-0 animate-pulse rounded-lg bg-tertiary/30" />
                                    <div className="flex-1 space-y-1.5">
                                        <ShimmerBar className="h-3 w-1/2" />
                                        <ShimmerBar className="h-2 w-1/3" />
                                    </div>
                                    <div className="shrink-0 space-y-1.5 text-right">
                                        <ShimmerBar className="ml-auto h-3 w-16" />
                                        <ShimmerBar className="ml-auto h-2 w-12" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </ToolCardShell>
    );
}
