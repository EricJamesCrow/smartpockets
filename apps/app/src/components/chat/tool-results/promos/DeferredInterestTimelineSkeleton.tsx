"use client";

import { ShimmerBar } from "../shared/Skeletons";
import { ToolCardShell } from "../shared/ToolCardShell";

export function DeferredInterestTimelineSkeleton() {
    return (
        <ToolCardShell title="Deferred-interest promos">
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="h-3 w-3 animate-pulse rounded-full bg-secondary" />
                        <div className="flex-1 space-y-1">
                            <ShimmerBar className="h-3 w-1/2" />
                            <ShimmerBar className="h-2 w-1/3" />
                        </div>
                        <ShimmerBar className="h-3 w-12" />
                    </div>
                ))}
            </div>
        </ToolCardShell>
    );
}
