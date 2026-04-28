"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@repo/ui/utils";

interface TickingValueProps {
    /** Pre-rendered snapshots to cycle through (e.g. ["-0.42%", "-0.41%", "-0.45%"]). */
    values: readonly string[];
    /** ms between updates. */
    interval?: number;
    /** Color tone — green for "up/live", rose for "down". */
    tone?: "up" | "down" | "neutral" | "amber";
    className?: string;
    /** Optional fixed width to prevent layout shift. */
    width?: string;
    /** Whether to animate flicker on change. */
    flicker?: boolean;
    /** Pause animation if reduced motion preferred. */
    label?: string;
}

const TONE_CLASS = {
    up: "text-brand-400",
    down: "text-rose-400",
    neutral: "text-zinc-300",
    amber: "text-amber-300",
} as const;

/**
 * Cycles through a set of pre-baked numeric strings to give a "live ticker" feel.
 * Avoids hydration mismatch by mounting silent until first client tick.
 */
export function TickingValue({
    values,
    interval = 1800,
    tone = "neutral",
    className,
    width,
    flicker = true,
    label,
}: TickingValueProps) {
    const [index, setIndex] = useState(0);
    const [pulse, setPulse] = useState(false);
    const mounted = useRef(false);

    useEffect(() => {
        mounted.current = true;
        if (typeof window === "undefined") return;
        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (reduced) return;
        const id = window.setInterval(() => {
            setIndex((i) => (i + 1) % values.length);
            if (flicker) {
                setPulse(true);
                window.setTimeout(() => setPulse(false), 220);
            }
        }, interval);
        return () => window.clearInterval(id);
    }, [values, interval, flicker]);

    return (
        <span
            aria-label={label}
            className={cx(
                "inline-block font-[family-name:var(--font-jetbrains-mono)] tabular-nums tracking-tight transition-[opacity,filter] duration-150",
                TONE_CLASS[tone],
                pulse && "[filter:drop-shadow(0_0_6px_currentColor)] opacity-90",
                className,
            )}
            style={width ? { minWidth: width } : undefined}
        >
            {values[index]}
        </span>
    );
}
