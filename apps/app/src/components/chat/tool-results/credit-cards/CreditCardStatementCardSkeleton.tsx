"use client";

import { ShimmerBar } from "../shared/Skeletons";
import { ToolCardShell } from "../shared/ToolCardShell";

/**
 * Mirrors the rich 5-column table layout used by `CreditCardStatementCard`
 * (Card identity w/ institution logo, Balance, Available, Limit + utilization,
 * Status badge) so the perceived shift between skeleton and hydrated rows is
 * minimal.
 */
export function CreditCardStatementCardSkeleton() {
    return (
        <ToolCardShell title="Credit cards" className="max-w-[820px]!">
            <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                        {/* Card identity (logo + name/mask) */}
                        <div className="flex flex-1 items-center gap-2.5 min-w-0">
                            <div className="size-10 shrink-0 animate-pulse rounded-lg bg-tertiary/30" />
                            <div className="flex-1 space-y-1.5">
                                <ShimmerBar className="h-3 w-32" />
                                <ShimmerBar className="h-2 w-20" />
                            </div>
                        </div>
                        {/* Balance */}
                        <ShimmerBar className="ml-auto h-3 w-16 shrink-0" />
                        {/* Available */}
                        <ShimmerBar className="h-3 w-16 shrink-0" />
                        {/* Limit + utilization */}
                        <div className="flex shrink-0 flex-col gap-1">
                            <ShimmerBar className="h-3 w-16" />
                            <ShimmerBar className="h-1.5 w-16 rounded-full" />
                        </div>
                        {/* Status badge */}
                        <ShimmerBar className="h-5 w-20 shrink-0 rounded-full" />
                    </div>
                ))}
            </div>
        </ToolCardShell>
    );
}
