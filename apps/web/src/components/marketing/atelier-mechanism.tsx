"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Mechanism plate — a watchmaker's exploded view of the product.
 * - Three feature cards arranged on a hairline circular movement diagram
 * - GSAP rotates the diagram on scroll (very subtly, no scrub library needed)
 */

const movements = [
    {
        idx: "01",
        title: "Plaid synchronization",
        body: "Every card balance, APR, payment due date, and utilization figure refreshes automatically. The mainspring of the system.",
        bullets: ["Real-time webhook delivery", "Automatic re-link on token expiry", "Idempotent transaction merge"],
    },
    {
        idx: "02",
        title: "Wallet escapements",
        body: "Group cards into custom wallets — Daily Drivers, Travel, Business — with drag-and-drop, pinned favorites, and shared notes.",
        bullets: ["Unlimited wallets", "Per-wallet aggregations", "Live total credit utilization"],
    },
    {
        idx: "03",
        title: "Detail complications",
        body: "Each card is a complete dossier: lock state, autopay, statement history, utilization curves, and notes — all in one face.",
        bullets: ["Statement timeline", "Utilization sparkline", "Custom note plate"],
    },
];

export const AtelierMechanism = () => {
    const rootRef = useRef<HTMLDivElement>(null);
    const dialRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!rootRef.current) return;
        const ctx = gsap.context(() => {
            // Slow, perpetual dial rotation
            gsap.to(dialRef.current, {
                rotate: 360,
                duration: 90,
                repeat: -1,
                ease: "none",
            });
            // Use IntersectionObserver for entrance, so SSR content stays visible
            // and we don't fight the screenshot timing.
            const cards = rootRef.current?.querySelectorAll<HTMLElement>("[data-mech-card]") ?? [];
            cards.forEach((card, i) => {
                gsap.set(card, { autoAlpha: 1 });
            });
            const io = new IntersectionObserver(
                (entries) => {
                    entries.forEach((e) => {
                        if (e.isIntersecting) {
                            const el = e.target as HTMLElement;
                            gsap.fromTo(el, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "expo.out", overwrite: "auto" });
                            io.unobserve(el);
                        }
                    });
                },
                { threshold: 0.18 },
            );
            cards.forEach((c) => io.observe(c));
            return () => io.disconnect();
        }, rootRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={rootRef}
            id="mechanism"
            className="relative overflow-hidden px-4 py-24 md:px-8 md:py-32"
        >
            <div className="mx-auto max-w-[1280px]">
                {/* Section header — asymmetric */}
                <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
                    <div className="md:col-span-2">
                        <p className="font-[family-name:var(--font-jetbrains)] text-[11px] tracking-[0.32em] text-amber-200/80 uppercase">
                            II / Mechanism
                        </p>
                    </div>
                    <div className="md:col-span-7">
                        <h2 className="font-[family-name:var(--font-fraunces)] text-[36px] leading-[1] font-light tracking-[-0.02em] text-white sm:text-[48px] md:text-[60px] lg:text-[72px] [font-variation-settings:'opsz'_144,'SOFT'_60]">
                            Three movements,{" "}
                            <span className="text-white/55 italic [font-variation-settings:'opsz'_144,'SOFT'_100,'WONK'_1]">
                                one calibre.
                            </span>
                        </h2>
                    </div>
                    <div className="md:col-span-3">
                        <p className="mt-3 font-[family-name:var(--font-familjen)] text-[15px] leading-[1.55] text-white/60 md:mt-0">
                            Power users juggling twelve cards deserve more than another budgeting app. SmartPockets is a tool plate, machined for the work.
                        </p>
                    </div>
                </div>

                {/* Mechanism stage */}
                <div className="relative mt-16 overflow-hidden rounded-[2.5rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-2xl md:mt-20">
                    {/* Atelier dial — animated */}
                    <div
                        ref={dialRef}
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 left-1/2 -z-0 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 will-change-transform"
                    >
                        <svg viewBox="0 0 1000 1000" className="h-full w-full opacity-40">
                            <defs>
                                <radialGradient id="dial-grad" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="rgba(252,211,77,0.18)" />
                                    <stop offset="60%" stopColor="rgba(252,211,77,0.06)" />
                                    <stop offset="100%" stopColor="transparent" />
                                </radialGradient>
                            </defs>
                            <circle cx="500" cy="500" r="450" fill="url(#dial-grad)" />
                            {Array.from({ length: 60 }).map((_, i) => {
                                const a = (i / 60) * Math.PI * 2;
                                const inner = i % 5 === 0 ? 410 : 430;
                                const outer = 450;
                                const x1 = 500 + Math.cos(a) * inner;
                                const y1 = 500 + Math.sin(a) * inner;
                                const x2 = 500 + Math.cos(a) * outer;
                                const y2 = 500 + Math.sin(a) * outer;
                                return (
                                    <line
                                        key={i}
                                        x1={x1}
                                        y1={y1}
                                        x2={x2}
                                        y2={y2}
                                        stroke={i % 5 === 0 ? "rgba(252,211,77,0.55)" : "rgba(255,255,255,0.25)"}
                                        strokeWidth={i % 5 === 0 ? 1.4 : 0.6}
                                    />
                                );
                            })}
                            <circle cx="500" cy="500" r="320" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6" />
                            <circle cx="500" cy="500" r="180" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" strokeDasharray="2 6" />
                            <circle cx="500" cy="500" r="60" fill="none" stroke="rgba(252,211,77,0.4)" strokeWidth="0.8" />
                        </svg>
                    </div>

                    <div className="relative grid grid-cols-1 gap-px overflow-hidden md:grid-cols-3">
                        {movements.map((m) => (
                            <article
                                key={m.idx}
                                data-mech-card
                                className="group relative overflow-hidden bg-black/30 p-6 backdrop-blur-md transition hover:bg-black/55 md:p-8 lg:p-10"
                            >
                                {/* Hairline tick */}
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/30 to-transparent opacity-0 transition group-hover:opacity-100" />

                                {/* Index */}
                                <div className="flex items-center justify-between">
                                    <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.32em] text-amber-200/75 uppercase">
                                        Calibre {m.idx}
                                    </span>
                                    <span className="atelier-cog inline-flex size-7 items-center justify-center rounded-full border border-white/10 text-amber-200/70">
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                            <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="0.8" />
                                            {Array.from({ length: 8 }).map((_, i) => {
                                                const a = (i / 8) * Math.PI * 2;
                                                const x1 = 6 + Math.cos(a) * 3;
                                                const y1 = 6 + Math.sin(a) * 3;
                                                const x2 = 6 + Math.cos(a) * 5;
                                                const y2 = 6 + Math.sin(a) * 5;
                                                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />;
                                            })}
                                        </svg>
                                    </span>
                                </div>

                                <h3 className="mt-12 font-[family-name:var(--font-fraunces)] text-[28px] leading-[1.05] font-light tracking-[-0.02em] text-white sm:text-[32px] [font-variation-settings:'opsz'_72,'SOFT'_50]">
                                    {m.title}
                                </h3>
                                <p className="mt-3 font-[family-name:var(--font-familjen)] text-[14px] leading-[1.55] text-white/55">
                                    {m.body}
                                </p>

                                <ul className="mt-6 space-y-1.5 border-t border-white/[0.06] pt-5">
                                    {m.bullets.map((b) => (
                                        <li key={b} className="flex items-baseline gap-2.5 font-[family-name:var(--font-jetbrains)] text-[11px] tracking-[0.05em] text-white/65">
                                            <span className="inline-block h-px w-3 bg-amber-200/60" aria-hidden />
                                            {b}
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};
