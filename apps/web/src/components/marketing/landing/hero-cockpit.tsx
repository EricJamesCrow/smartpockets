"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CreditCard } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";
import { cx } from "@repo/ui/utils";
import { TickingValue } from "./ticking-value";
import { Sparkline } from "./sparkline";

const NETWORTH_SERIES = [
    18120, 18204, 18180, 18260, 18190, 18305, 18290, 18380, 18420, 18395, 18480, 18510,
];

/**
 * The right-side "cockpit" panel for the hero. Stacked cards on a glass plate
 * with a sparkline, ticking values, and gentle scroll-scrubbed parallax.
 */
export function HeroCockpit({ className }: { className?: string }) {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (reduced) return;
        if (!rootRef.current) return;

        gsap.registerPlugin(ScrollTrigger);
        const ctx = gsap.context(() => {
            // Subtle parallax: shift the card stack up as user scrolls into hero.
            gsap.to("[data-cockpit-cards]", {
                yPercent: -8,
                ease: "none",
                scrollTrigger: {
                    trigger: rootRef.current,
                    start: "top top",
                    end: "bottom top",
                    scrub: 0.6,
                },
            });
            // Floating idle motion on the front card
            gsap.to("[data-cockpit-card-front]", {
                y: "-=6",
                duration: 3.2,
                yoyo: true,
                repeat: -1,
                ease: "sine.inOut",
            });
        }, rootRef);

        return () => ctx.revert();
    }, []);

    return (
        <div ref={rootRef} className={cx("relative", className)}>
            {/* Outer glass panel */}
            <div className="relative isolate overflow-hidden border border-white/[0.08] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_30px_120px_-40px_rgba(60,203,127,0.35)] backdrop-blur-xl sm:p-5">
                {/* Glass scanlines */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.04)_0px,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_3px)]"
                />
                {/* Top row: ticker + delta */}
                <div className="relative z-10 flex items-center justify-between border-b border-white/[0.06] pb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-500">
                    <div className="flex items-center gap-2">
                        <span className="size-1.5 animate-pulse rounded-full bg-brand-400 shadow-[0_0_10px_rgba(60,203,127,0.6)]" />
                        <span className="text-zinc-400">SPK · NET WORTH</span>
                        <span className="hidden text-zinc-700 sm:inline">|</span>
                        <span className="hidden text-zinc-500 sm:inline">12 CARDS</span>
                    </div>
                    <span className="text-zinc-500">{new Date().getFullYear()}</span>
                </div>

                {/* Big number + spark */}
                <div className="relative z-10 mt-3 grid grid-cols-[1fr_auto] items-end gap-3 sm:gap-5">
                    <div className="flex flex-col gap-1">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">USD · NET</span>
                        <div className="flex items-baseline gap-2 font-[family-name:var(--font-jetbrains-mono)] tabular-nums">
                            <span className="text-2xl font-semibold text-zinc-100 sm:text-3xl">
                                $
                                <TickingValue
                                    values={["18,420", "18,395", "18,480", "18,510", "18,442"] as const}
                                    interval={2200}
                                    tone="neutral"
                                    className="text-2xl font-semibold sm:text-3xl"
                                    label="net worth"
                                />
                            </span>
                            <TickingValue
                                values={["+1.42%", "+1.61%", "+1.27%", "+1.80%"] as const}
                                interval={2200}
                                tone="up"
                                className="text-xs sm:text-sm"
                                label="net worth daily change"
                            />
                        </div>
                    </div>
                    <Sparkline points={NETWORTH_SERIES} grid width={140} height={48} className="shrink-0" />
                </div>

                {/* Card stack */}
                <div className="relative z-10 mt-5 h-44 sm:h-56 lg:h-72" data-cockpit-cards>
                    <div className="absolute inset-0 flex items-end justify-center">
                        {/* back card */}
                        <div
                            className="absolute right-2 top-0 origin-bottom-right rotate-[8deg] opacity-90 sm:right-6"
                            style={{ filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.45))" }}
                        >
                            <CreditCard
                                type="gray-dark"
                                cardHolder="Eric Crow"
                                width={210}
                                className="sm:[--card-w:260px] lg:[--card-w:300px]"
                            />
                        </div>
                        {/* mid card */}
                        <div
                            className="absolute left-1/2 top-3 origin-bottom -translate-x-[55%] rotate-[-3deg] sm:top-6"
                            style={{ filter: "drop-shadow(0 28px 50px rgba(22,179,100,0.25))" }}
                        >
                            <CreditCard type="brand-dark" cardHolder="Eric Crow" width={224} />
                        </div>
                        {/* front card */}
                        <div
                            data-cockpit-card-front
                            className="absolute bottom-0 left-2 origin-bottom -rotate-[6deg] sm:left-4"
                            style={{ filter: "drop-shadow(0 30px 50px rgba(0,0,0,0.6))" }}
                        >
                            <CreditCard type="transparent-gradient" cardHolder="Eric Crow" width={244} />
                        </div>
                    </div>
                </div>

                {/* Per-card mini ticker rows */}
                <div className="relative z-10 mt-5 grid grid-cols-1 gap-2 border-t border-white/[0.06] pt-4 sm:grid-cols-3">
                    <MiniRow label="AMEX_PLAT" detailLabel="UTIL" tone="down" values={["38.2%", "37.9%", "38.4%", "37.6%"]} />
                    <MiniRow label="SAPPHIRE_R" detailLabel="PMT" tone="neutral" values={["$1,204", "$1,210", "$1,198", "$1,217"]} />
                    <MiniRow label="DISCOVER_IT" detailLabel="REW" tone="up" values={["+1,840", "+1,852", "+1,872", "+1,820"]} />
                </div>
            </div>
        </div>
    );
}

function MiniRow({ label, detailLabel, values, tone }: { label: string; detailLabel: string; values: readonly string[]; tone: "up" | "down" | "neutral" }) {
    return (
        <div className="group flex items-center justify-between gap-3 border border-white/[0.05] bg-white/[0.02] px-3 py-2 transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px hover:border-brand-500/40 hover:bg-brand-500/[0.05]">
            <div className="flex flex-col">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-zinc-500 transition-colors duration-150 group-hover:text-zinc-300">{label}</span>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-zinc-700">{detailLabel}</span>
            </div>
            <TickingValue
                values={values}
                tone={tone}
                interval={2400}
                className="text-sm font-semibold"
                label={`${label} ${detailLabel}`}
            />
        </div>
    );
}
