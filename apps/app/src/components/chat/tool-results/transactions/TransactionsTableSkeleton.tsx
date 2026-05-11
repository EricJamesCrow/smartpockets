"use client";

import { ShimmerBar } from "../shared/Skeletons";
import { ToolCardShell } from "../shared/ToolCardShell";

/**
 * Skeleton for the chat tool-result Transactions table.
 *
 * Mirrors the rich 6-column layout (Date · Merchant w/ logo · Category badge ·
 * Source w/ card avatar · Status badge · Amount) so that the perceived layout
 * shift between skeleton and hydrated rows is minimal.
 */
export function TransactionsTableSkeleton(props: { input?: unknown }) {
    const presentation = (props?.input as { presentation?: "widget" | "inline" } | undefined)?.presentation;
    if (presentation === "inline") {
        return null;
    }
    return (
        <ToolCardShell title="Transactions" className="max-w-[820px]!">
            <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                        {/* Date */}
                        <ShimmerBar className="h-3 w-12 shrink-0" />
                        {/* Merchant w/ logo */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className="size-8 shrink-0 animate-pulse rounded-full bg-tertiary/30" />
                            <ShimmerBar className="h-3 w-32" />
                        </div>
                        {/* Category badge */}
                        <ShimmerBar className="h-5 w-20 shrink-0 rounded-full" />
                        {/* Source w/ avatar */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="size-8 shrink-0 animate-pulse rounded-lg bg-tertiary/30" />
                            <div className="flex flex-col gap-1">
                                <ShimmerBar className="h-2.5 w-20" />
                                <ShimmerBar className="h-2 w-10" />
                            </div>
                        </div>
                        {/* Status badge */}
                        <ShimmerBar className="h-5 w-14 shrink-0 rounded-full" />
                        {/* Amount */}
                        <ShimmerBar className="h-3 w-16 shrink-0" />
                    </div>
                ))}
            </div>
        </ToolCardShell>
    );
}
