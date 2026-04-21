"use client";

import { ShimmerBar } from "../shared/Skeletons";
import { ToolCardShell } from "../shared/ToolCardShell";

export function CreditCardStatementCardSkeleton() {
    return (
        <ToolCardShell title="Credit card">
            <div className="space-y-3">
                <ShimmerBar className="h-6 w-1/2" />
                <div className="grid grid-cols-2 gap-2">
                    <ShimmerBar className="h-3 w-full" />
                    <ShimmerBar className="h-3 w-full" />
                    <ShimmerBar className="h-3 w-full" />
                    <ShimmerBar className="h-3 w-full" />
                </div>
            </div>
        </ToolCardShell>
    );
}
