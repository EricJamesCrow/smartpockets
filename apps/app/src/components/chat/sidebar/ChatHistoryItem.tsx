"use client";

import Link from "next/link";
import { cx } from "@/utils/cx";
import { truncate } from "@/utils/truncate";

interface ChatHistoryItemProps {
    threadId: string;
    title: string;
    isActive: boolean;
    summary?: string;
}

export function ChatHistoryItem({ threadId, title, isActive, summary }: ChatHistoryItemProps) {
    return (
        <li>
            <Link
                href={`/${threadId}`}
                title={summary ?? title}
                aria-current={isActive ? "page" : undefined}
                className={cx(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActive
                        ? "bg-secondary text-primary dark:bg-[var(--sp-surface-panel-strong)]"
                        : "text-secondary hover:bg-secondary/50 hover:text-primary dark:hover:bg-white/5",
                )}
            >
                <span className="block truncate">{truncate(title, 40)}</span>
            </Link>
        </li>
    );
}
