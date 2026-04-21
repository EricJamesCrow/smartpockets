"use client";

import { ShimmerBar } from "../shared/Skeletons";
import { ToolCardShell } from "../shared/ToolCardShell";

export function TransactionDetailCardSkeleton() {
    return (
        <ToolCardShell title="Transaction">
            <div className="space-y-3">
                <ShimmerBar className="h-4 w-1/2" />
                <ShimmerBar className="h-3 w-3/4" />
                <ShimmerBar className="h-3 w-1/3" />
            </div>
        </ToolCardShell>
    );
}
