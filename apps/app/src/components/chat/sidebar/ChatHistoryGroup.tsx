"use client";

import type { ReactNode } from "react";

interface ChatHistoryGroupProps {
    label: string;
    children: ReactNode;
}

export function ChatHistoryGroup({ label, children }: ChatHistoryGroupProps) {
    return (
        <div className="space-y-1">
            <p className="px-2 text-[10px] font-medium uppercase tracking-[0.18em] text-tertiary">
                {label}
            </p>
            <ul className="space-y-0.5">{children}</ul>
        </div>
    );
}
