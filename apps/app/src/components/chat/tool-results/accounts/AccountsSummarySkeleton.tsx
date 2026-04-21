"use client";

import { ShimmerBar } from "../shared/Skeletons";
import { ToolCardShell } from "../shared/ToolCardShell";

export function AccountsSummarySkeleton() {
    return (
        <ToolCardShell title="Accounts">
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-1">
                        <div className="flex-1 space-y-1">
                            <ShimmerBar className="h-3 w-3/4" />
                            <ShimmerBar className="h-2 w-1/3" />
                        </div>
                        <ShimmerBar className="h-3 w-20" />
                    </div>
                ))}
            </div>
        </ToolCardShell>
    );
}
