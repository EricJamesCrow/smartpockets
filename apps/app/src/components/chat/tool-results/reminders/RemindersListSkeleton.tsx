"use client";

import { ShimmerBar } from "../shared/Skeletons";
import { ToolCardShell } from "../shared/ToolCardShell";

export function RemindersListSkeleton() {
    return (
        <ToolCardShell title="Reminders">
            <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-1">
                        <ShimmerBar className="h-3 flex-1" />
                        <ShimmerBar className="h-3 w-20" />
                    </div>
                ))}
            </div>
        </ToolCardShell>
    );
}
