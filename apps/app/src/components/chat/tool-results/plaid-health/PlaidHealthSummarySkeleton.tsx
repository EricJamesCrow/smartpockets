"use client";

import { ShimmerBar } from "../shared/Skeletons";
import { ToolCardShell } from "../shared/ToolCardShell";

export function PlaidHealthSummarySkeleton() {
    return (
        <ToolCardShell title="Bank connections">
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 py-1">
                        <div className="flex-1 space-y-1.5">
                            <ShimmerBar className="h-3 w-2/3" />
                            <ShimmerBar className="h-2 w-1/3" />
                        </div>
                        <ShimmerBar className="h-5 w-16 rounded-full" />
                    </div>
                ))}
            </div>
        </ToolCardShell>
    );
}
