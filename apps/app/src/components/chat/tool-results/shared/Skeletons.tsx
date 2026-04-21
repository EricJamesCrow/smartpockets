"use client";

import { cx } from "@/utils/cx";

/**
 * Shared shimmer primitive. ToolResultRenderer delegates to per-component
 * skeletons when registered; this renders when no Skeleton is in the registry
 * entry.
 */
export function SharedShimmer({ className }: { className?: string }) {
    return (
        <div
            className={cx(
                "h-24 max-w-[640px] animate-pulse rounded-xl border border-secondary bg-secondary",
                className,
            )}
        />
    );
}

/**
 * Thin pulse bar used inside skeleton card bodies.
 */
export function ShimmerBar({ className }: { className?: string }) {
    return <div className={cx("h-3 animate-pulse rounded bg-secondary", className)} />;
}

/**
 * Round pulse used for avatars, chart dots, etc.
 */
export function ShimmerDot({ className }: { className?: string }) {
    return <div className={cx("h-8 w-8 animate-pulse rounded-full bg-secondary", className)} />;
}
