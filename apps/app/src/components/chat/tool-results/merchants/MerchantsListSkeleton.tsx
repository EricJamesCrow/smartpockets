"use client";

import { ShimmerBar } from "../shared/Skeletons";
import { ToolCardShell } from "../shared/ToolCardShell";

export function MerchantsListSkeleton() {
    return (
        <ToolCardShell title="Merchants">
            <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-12 items-center gap-3 py-1">
                        <ShimmerBar className="col-span-6 h-3" />
                        <ShimmerBar className="col-span-2 h-3" />
                        <ShimmerBar className="col-span-2 h-3" />
                        <ShimmerBar className="col-span-2 h-3" />
                    </div>
                ))}
            </div>
        </ToolCardShell>
    );
}
