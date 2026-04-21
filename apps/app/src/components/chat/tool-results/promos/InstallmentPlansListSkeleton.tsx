"use client";

import { ShimmerBar } from "../shared/Skeletons";
import { ToolCardShell } from "../shared/ToolCardShell";

export function InstallmentPlansListSkeleton() {
    return (
        <ToolCardShell title="Installment plans">
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-1">
                        <div className="flex-1 space-y-1">
                            <ShimmerBar className="h-3 w-1/2" />
                            <ShimmerBar className="h-2 w-1/3" />
                        </div>
                        <div className="shrink-0 space-y-1 text-right">
                            <ShimmerBar className="h-3 w-20" />
                            <ShimmerBar className="h-2 w-14" />
                        </div>
                    </div>
                ))}
            </div>
        </ToolCardShell>
    );
}
