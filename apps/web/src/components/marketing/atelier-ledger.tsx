"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const lines = [
    { num: "01", text: "We are not a data broker.", quiet: false },
    { num: "02", text: "Your transactions never train a model we sell.", quiet: false },
    { num: "03", text: "Self-host on your own machine in one command.", quiet: false },
    { num: "04", text: "Pay only what the API costs us.", quiet: false },
    { num: "05", text: "Read every line of source.", quiet: true },
];

/**
 * Ledger plate — typographic statement section. Big serif lines on a hairline rule.
 * Each line scrolls in with a "stamping" animation (set color from amber to white).
 */
export const AtelierLedger = () => {
    const rootRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!rootRef.current) return;
        const ctx = gsap.context(() => {
            const lines = rootRef.current?.querySelectorAll<HTMLElement>("[data-ledger-line]") ?? [];
            const io = new IntersectionObserver(
                (entries) => {
                    entries.forEach((e, i) => {
                        if (e.isIntersecting) {
                            const el = e.target as HTMLElement;
                            gsap.fromTo(
                                el,
                                { xPercent: -3, opacity: 0, filter: "blur(8px)" },
                                { xPercent: 0, opacity: 1, filter: "blur(0px)", duration: 1, ease: "expo.out", delay: i * 0.05, overwrite: "auto" },
                            );
                            io.unobserve(el);
                        }
                    });
                },
                { threshold: 0.4 },
            );
            lines.forEach((c) => io.observe(c));
            return () => io.disconnect();
        }, rootRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={rootRef}
            id="ledger"
            className="relative overflow-hidden px-4 py-24 md:px-8 md:py-32"
        >
            <div className="mx-auto max-w-[1280px]">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
                    <div className="md:col-span-3">
                        <p className="font-[family-name:var(--font-jetbrains)] text-[11px] tracking-[0.32em] text-amber-200/80 uppercase">
                            IV / Ledger
                        </p>
                        <p className="mt-3 font-[family-name:var(--font-familjen)] text-[14px] leading-[1.55] text-white/55">
                            Five non-negotiables, kept on the open ledger. Read them like an oath.
                        </p>
                    </div>
                    <div className="md:col-span-9">
                        <ol className="grid grid-cols-1">
                            {lines.map((line) => (
                                <li
                                    key={line.num}
                                    data-ledger-line
                                    className="group flex flex-col gap-2 border-b border-white/[0.06] py-6 md:flex-row md:items-baseline md:gap-8 md:py-8"
                                >
                                    <span className="font-[family-name:var(--font-jetbrains)] text-[12px] tracking-[0.18em] text-amber-200/70 uppercase md:w-12">
                                        {line.num}
                                    </span>
                                    <span
                                        className={
                                            "flex-1 font-[family-name:var(--font-fraunces)] text-[28px] leading-[1.1] font-light tracking-[-0.02em] sm:text-[40px] md:text-[52px] lg:text-[64px] [font-variation-settings:'opsz'_144,'SOFT'_50] " +
                                            (line.quiet ? "text-white/45 italic [font-variation-settings:'opsz'_144,'SOFT'_100,'WONK'_1]" : "text-white")
                                        }
                                    >
                                        {line.text}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </section>
    );
};
