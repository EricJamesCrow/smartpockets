"use client";

import { useEffect, useRef, type FormEvent } from "react";
import gsap from "gsap";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { CreditCard } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";

/**
 * Atelier hero: a watchmaker's display case.
 * - Left column: typographic plate (Fraunces display + Familjen body + JetBrains caption)
 * - Right column: glass case with three suspended cards, GSAP-animated entrance + perpetual hover
 * - Hairline schematic guides drawn behind the case
 */
export const AtelierHero = () => {
    const rootRef = useRef<HTMLDivElement>(null);
    const caseRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!rootRef.current) return;
        const ctx = gsap.context(() => {
            // Stagger in headline lines, eyebrow, etc.
            gsap.from("[data-atelier-stagger]", {
                yPercent: 18,
                opacity: 0,
                filter: "blur(12px)",
                duration: 1.1,
                stagger: 0.07,
                ease: "expo.out",
            });

            // Card animations only on sm+ (640px+) — on mobile the cards stack
            // in a fan via CSS transforms and we let them be still.
            const isWide = window.matchMedia("(min-width: 640px)").matches;
            if (!isWide) return;

            // Cards fan in via opacity only — the CSS keyframe owns the position.
            gsap.from("[data-atelier-card]", {
                opacity: 0,
                duration: 1.4,
                stagger: 0.12,
                ease: "expo.out",
                delay: 0.25,
            });

            // Subtle parallax on caseRef from pointer
            const onMove = (e: PointerEvent) => {
                if (!caseRef.current) return;
                const r = caseRef.current.getBoundingClientRect();
                const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
                const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
                gsap.to(caseRef.current, {
                    rotateX: -dy * 6,
                    rotateY: dx * 8,
                    duration: 0.6,
                    ease: "power2.out",
                });
            };
            window.addEventListener("pointermove", onMove);
            return () => window.removeEventListener("pointermove", onMove);
        }, rootRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={rootRef}
            id="atelier"
            className="relative overflow-hidden px-4 pt-16 pb-24 md:px-8 md:pt-20 md:pb-28 lg:pt-28 lg:pb-32"
        >
            {/* Ambient hairline ruler */}
            <div className="pointer-events-none absolute inset-x-4 top-10 hidden items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.32em] text-white/30 uppercase md:flex md:px-4">
                <span>00</span>
                <span className="h-px flex-1 bg-gradient-to-r from-white/10 via-white/30 to-white/10" />
                <span>Atelier no.04</span>
                <span className="h-px flex-1 bg-gradient-to-r from-white/10 via-white/30 to-white/10" />
                <span>2026 / Q2</span>
            </div>

            <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
                {/* Left — typographic plate */}
                <div className="relative flex flex-col">
                    {/* Eyebrow with hallmark */}
                    <div data-atelier-stagger className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[11px] tracking-[0.32em] text-amber-200/80 uppercase">
                        <span className="inline-flex h-[1px] w-8 bg-amber-200/60" />
                        <span>Personal finance, hand-finished</span>
                    </div>

                    {/* Display — mixed serif + grotesk */}
                    <h1
                        data-atelier-stagger
                        className="mt-6 font-[family-name:var(--font-fraunces)] text-[44px] leading-[0.95] font-light tracking-[-0.03em] text-white sm:text-[58px] md:text-[78px] lg:text-[92px] [font-variation-settings:'opsz'_144,'SOFT'_30,'WONK'_0]"
                    >
                        Your money,{" "}
                        <span className="text-white/55 italic [font-variation-settings:'opsz'_144,'SOFT'_100,'WONK'_1]">
                            unlocked
                        </span>
                    </h1>
                    <p
                        data-atelier-stagger
                        className="mt-4 font-[family-name:var(--font-fraunces)] text-[44px] leading-[0.95] font-light tracking-[-0.03em] sm:text-[58px] md:text-[78px] lg:text-[92px] [font-variation-settings:'opsz'_144,'SOFT'_30]"
                    >
                        <span className="atelier-engrave">like a watch.</span>
                    </p>

                    {/* Body — grotesk supporting */}
                    <p
                        data-atelier-stagger
                        className="mt-8 max-w-md font-[family-name:var(--font-familjen)] text-[17px] leading-[1.55] text-white/65 md:text-[18px]"
                    >
                        SmartPockets is the open source alternative to YNAB and Monarch, machined for people
                        who care about provenance: every card, every payment, every cent — visible, owned,
                        and never resold.
                    </p>

                    {/* Form — atelier-styled */}
                    <Form
                        data-atelier-stagger
                        onSubmit={(e: FormEvent<HTMLFormElement>) => {
                            e.preventDefault();
                            e.currentTarget.reset();
                        }}
                        className="mt-10 flex w-full max-w-[28rem] flex-col gap-3 sm:flex-row sm:items-start"
                    >
                        <Input
                            isRequired
                            size="md"
                            name="email"
                            type="email"
                            placeholder="you@atelier.com"
                            wrapperClassName="py-0.5 flex-1"
                            hint={
                                <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.18em] text-white/35 uppercase">
                                    No marketing. Provenance only.
                                </span>
                            }
                        />
                        <Button type="submit" size="xl">
                            Reserve
                        </Button>
                    </Form>

                    {/* Microcopy hallmark row */}
                    <div data-atelier-stagger className="mt-12 grid grid-cols-3 gap-6 border-t border-white/[0.06] pt-6 max-w-md">
                        {[
                            ["MIT", "License"],
                            ["100%", "Convex-native"],
                            ["0", "Data sold"],
                        ].map(([num, label]) => (
                            <div key={label}>
                                <p className="font-[family-name:var(--font-jetbrains)] text-[24px] leading-none tracking-[-0.02em] text-amber-100">
                                    {num}
                                </p>
                                <p className="mt-2 font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.32em] text-white/40 uppercase">
                                    {label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right — glass case */}
                <div className="relative">
                    {/* Schematic plate behind */}
                    <svg
                        aria-hidden
                        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]"
                        viewBox="0 0 600 700"
                        preserveAspectRatio="xMidYMid slice"
                    >
                        <defs>
                            <pattern id="atelier-hairline" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.4" />
                            </pattern>
                        </defs>
                        <rect width="600" height="700" fill="url(#atelier-hairline)" />
                        <circle cx="300" cy="350" r="240" fill="none" stroke="rgba(252,211,77,0.35)" strokeWidth="0.6" strokeDasharray="2 4" />
                        <circle cx="300" cy="350" r="160" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" />
                        <circle cx="300" cy="350" r="80" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
                        <line x1="0" y1="350" x2="600" y2="350" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" strokeDasharray="2 6" />
                        <line x1="300" y1="0" x2="300" y2="700" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" strokeDasharray="2 6" />
                        <text x="20" y="20" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="ui-monospace">A04 · 0001</text>
                        <text x="540" y="690" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="ui-monospace">±0.001</text>
                    </svg>

                    {/* Glass case */}
                    <div
                        ref={caseRef}
                        className="atelier-case relative aspect-[4/5] w-full overflow-hidden rounded-[2.25rem] border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent backdrop-blur-2xl will-change-transform"
                        style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
                    >
                        {/* Inner case label */}
                        <div className="absolute inset-x-6 top-5 flex items-center justify-between font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.32em] text-white/35 uppercase">
                            <span>Display case</span>
                            <span>3 spec.</span>
                        </div>

                        {/* Cards arranged like a fan */}
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                            <div className="relative h-64 w-64 sm:h-72 sm:w-72 md:h-80 md:w-80">
                                <div
                                    data-atelier-card="left"
                                    className="atelier-card-left absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                >
                                    <CreditCard type="brand-dark" cardHolder="Eric Crow" width={210} />
                                </div>
                                <div
                                    data-atelier-card="right"
                                    className="atelier-card-right absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                >
                                    <CreditCard type="gradient-strip" cardHolder="Eric Crow" width={210} />
                                </div>
                                <div
                                    data-atelier-card="center"
                                    className="atelier-card-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 will-change-transform"
                                >
                                    <div className="rounded-2xl shadow-[0_30px_80px_-20px_rgba(252,211,77,0.35)]">
                                        <CreditCard type="gray-dark" cardHolder="Eric Crow" width={230} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Inner reflection sheen */}
                        <div
                            className="pointer-events-none absolute inset-0 mix-blend-screen"
                            style={{
                                background:
                                    "radial-gradient(ellipse 60% 40% at 30% 0%, rgba(255,255,255,0.18), transparent 60%)",
                            }}
                        />

                        {/* Bottom plaque */}
                        <div className="absolute inset-x-6 bottom-5 flex items-center justify-between rounded-full border border-white/[0.08] bg-black/40 px-4 py-2 backdrop-blur-md">
                            <div className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.18em] text-white/65 uppercase">
                                <span className="inline-block size-1.5 rounded-full bg-amber-200 shadow-[0_0_12px_rgba(252,211,77,0.6)]" />
                                <span>Lot 0001 / Hallmark</span>
                            </div>
                            <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.18em] text-amber-200/85 uppercase">SP · 2026</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
