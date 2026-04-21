"use client";

import type { ReactNode } from "react";

import { cx } from "@/utils/cx";

type Props = {
    title?: string;
    subtitle?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
};

export function ToolCardShell({ title, subtitle, action, children, className }: Props) {
    return (
        <section
            className={cx(
                "max-w-[640px] rounded-xl border border-secondary bg-primary px-4 py-4 shadow-xs",
                className,
            )}
        >
            {(title || action) && (
                <header className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {title && <h3 className="truncate text-sm font-semibold text-primary">{title}</h3>}
                        {subtitle && <p className="mt-0.5 text-xs text-tertiary">{subtitle}</p>}
                    </div>
                    {action}
                </header>
            )}
            {children}
        </section>
    );
}
