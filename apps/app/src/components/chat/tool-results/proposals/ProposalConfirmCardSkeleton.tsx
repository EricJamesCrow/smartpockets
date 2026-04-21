"use client";

import { ShimmerBar } from "../shared/Skeletons";
import { ToolCardShell } from "../shared/ToolCardShell";

export function ProposalConfirmCardSkeleton() {
    return (
        <ToolCardShell title="Proposal">
            <div className="space-y-3">
                <ShimmerBar className="h-4 w-2/3" />
                <ShimmerBar className="h-3 w-1/2" />
                <ShimmerBar className="h-3 w-1/3" />
                <div className="flex items-center justify-end gap-2 pt-2">
                    <ShimmerBar className="h-8 w-20" />
                    <ShimmerBar className="h-8 w-24" />
                </div>
            </div>
        </ToolCardShell>
    );
}
