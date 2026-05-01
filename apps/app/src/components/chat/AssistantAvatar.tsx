"use client";

import { cx } from "@/utils/cx";

interface AssistantAvatarProps {
    size?: "sm" | "md";
    className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AssistantAvatarProps["size"]>, string> = {
    sm: "size-8 text-xs",
    md: "size-10 text-xs",
};

export function AssistantAvatar({ size = "md", className }: AssistantAvatarProps) {
    return (
        <div
            className={cx(
                "flex shrink-0 items-center justify-center rounded-full",
                "border border-secondary bg-secondary text-primary",
                "dark:border-[var(--sp-moss-line)] dark:bg-[var(--sp-surface-panel-strong)]",
                SIZE_CLASSES[size],
                className,
            )}
            aria-hidden
        >
            <span className="font-[family-name:var(--font-fraunces)] italic">SP</span>
        </div>
    );
}
