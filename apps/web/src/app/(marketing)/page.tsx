"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import {
    ArrowUpRight,
    BarChart04,
    BarLineChart,
    Code02,
    CreditCard02,
    Database02,
    Lock04,
    Stars02,
    Zap,
} from "@untitledui/icons";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { CreditCard } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";
import { FeaturedIcon } from "@repo/ui/untitledui/foundations/featured-icon/featured-icon";
import { MarketingEmailForm } from "@/components/marketing/marketing-email-form";

/* ──────────────────────────────────────────────────────────────────────────
   Editorial helpers — small primitives that establish a consistent voice.
   ────────────────────────────────────────────────────────────────────────── */

const Eyebrow = ({ children, number }: { children: ReactNode; number?: string }) => (
    <p className="inline-flex items-center gap-2.5 text-[0.72rem] font-medium uppercase tracking-[0.22em] text-gray-400">
        {number && <span className="font-mono text-brand-300/80 tabular-nums">{number}</span>}
        <span className="h-px w-6 bg-gradient-to-r from-brand-400/60 to-transparent" aria-hidden="true" />
        <span className="text-gray-300">{children}</span>
    </p>
);

const SectionShell = ({
    id,
    children,
    className = "",
    refProp,
}: {
    id?: string;
    children: ReactNode;
    className?: string;
    refProp?: React.RefObject<HTMLElement | null>;
}) => (
    <section
        id={id}
        ref={refProp}
        className={`relative px-4 py-20 sm:px-6 md:py-28 lg:px-8 lg:py-32 ${className}`}
    >
        <div className="mx-auto w-full max-w-7xl">{children}</div>
    </section>
);

/* ──────────────────────────────────────────────────────────────────────────
   Hero — wallet stage on the right, editorial copy on the left.
   The wallet stage is a contained surface that crops cards via overflow-hidden;
   cards never bleed outside their frame on any breakpoint.
   ────────────────────────────────────────────────────────────────────────── */

const WalletStage = () => (
    <div className="relative w-full">
        <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.045] p-1.5 shadow-[0_40px_120px_-24px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[calc(2.25rem-0.375rem)] bg-[#06100c] sm:aspect-[6/5] lg:aspect-[4/5]">
                {/* tinted ambient gradient */}
                <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(34,211,141,0.18),transparent_38%),radial-gradient(circle_at_82%_8%,rgba(180,213,200,0.08),transparent_32%),linear-gradient(160deg,rgba(255,255,255,0.05),transparent_55%)]"
                />
                {/* grid grain */}
                <div
                    aria-hidden="true"
                    className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.65)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.65)_1px,transparent_1px)] [background-size:32px_32px]"
                />

                {/* Wallet health overlay — top-left */}
                <div className="sp-stage-card absolute left-4 right-4 top-4 z-30 rounded-3xl border border-white/[0.08] bg-black/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md sm:left-6 sm:right-6 sm:top-6">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-brand-200">wallet health</p>
                            <p className="mt-1.5 text-[1.85rem] font-semibold leading-none tracking-tight text-white tabular-nums sm:text-[2.1rem]">
                                $18,420
                            </p>
                            <p className="mt-1.5 text-[0.7rem] font-medium text-gray-400">across 12 cards · 4 wallets</p>
                        </div>
                        <div className="rounded-full border border-brand-300/25 bg-brand-300/10 px-2.5 py-1 text-[0.7rem] font-semibold text-brand-100 tabular-nums">
                            72.4%
                        </div>
                    </div>
                </div>

                {/* Card 1 — primary, slightly behind, top-leaning */}
                <div className="sp-stage-card absolute left-[6%] top-[34%] z-10 w-[72%] -rotate-[10deg] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-rotate-[7deg] hover:scale-[1.02] sm:left-[10%] sm:top-[30%] sm:w-[64%]">
                    <CreditCard type="brand-dark" brand="visa" cardHolder="ERIC CROW" cardNumber="4821 3840 1288 9024" />
                </div>

                {/* Card 2 — tucked top-right, taller card stack feel */}
                <div className="sp-stage-card absolute right-[-4%] top-[44%] z-20 w-[68%] rotate-[8deg] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:rotate-[5deg] hover:scale-[1.02] sm:right-[2%] sm:top-[40%] sm:w-[60%]">
                    <CreditCard type="transparent-gradient" brand="amex" cardHolder="ERIC CROW" cardNumber="3791 024801 44712" />
                </div>

                {/* Card 3 — bottom anchor */}
                <div className="sp-stage-card absolute bottom-[14%] left-[12%] z-30 w-[64%] -rotate-[3deg] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:rotate-0 hover:scale-[1.02] sm:bottom-[16%] sm:left-[16%] sm:w-[56%]">
                    <CreditCard type="gray-dark" brand="mastercard" cardHolder="ERIC CROW" cardNumber="5498 9031 2740 1184" />
                </div>

                {/* Reminder card bottom-right */}
                <div className="sp-stage-card absolute bottom-4 right-4 z-30 w-[55%] max-w-56 rounded-3xl border border-white/[0.08] bg-black/45 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md sm:bottom-6 sm:right-6">
                    <div className="flex items-center gap-2">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-400 shadow-[0_0_10px_rgba(34,211,141,0.7)]" />
                        <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-gray-400">due in 4 days</p>
                    </div>
                    <p className="mt-2 text-[0.85rem] font-semibold leading-tight text-white">Chase Sapphire · $342.18</p>
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-brand-400 to-brand-300" />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

/* ──────────────────────────────────────────────────────────────────────────
   Stat strip — replaces the generic marquee. Three calibrated metrics in
   a row, framed by a glass divider. Tighter, more editorial than scrolling pills.
   ────────────────────────────────────────────────────────────────────────── */

const stats = [
    { value: "12+", label: "credit cards tracked daily by the founder" },
    { value: "0", label: "API routes — Convex pushes everything in real time" },
    { value: "100%", label: "open source. no subscription gating, no data brokerage" },
];

const StatStrip = () => (
    <section aria-label="At a glance" className="relative border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-white/[0.06] px-4 py-10 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 sm:py-12 lg:px-8">
            {stats.map((stat, index) => (
                <div key={stat.value} className="flex flex-col gap-2 px-0 py-6 sm:px-8 sm:py-2">
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-gray-500 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                    <p className="text-[2.4rem] font-semibold leading-none tracking-tight text-white tabular-nums sm:text-[2.6rem]">{stat.value}</p>
                    <p className="max-w-[28ch] text-[0.875rem] leading-6 text-gray-400">{stat.label}</p>
                </div>
            ))}
        </div>
    </section>
);

/* ──────────────────────────────────────────────────────────────────────────
   Bento — asymmetric 12-col grid. One 7-span card, one 5-span card, with
   varied row spans so the grid is dense and uneven.
   ────────────────────────────────────────────────────────────────────────── */

const GlassCard = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={`group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.035] p-1.5 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] transition-[border-color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-white/[0.14] ${className ?? ""}`}>
        <div className="relative flex h-full min-h-64 flex-col overflow-hidden rounded-[1.4rem] bg-[#070d0b] p-6 md:p-8">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(34,211,141,0.10),transparent_38%)]"
            />
            <div className="relative flex h-full flex-col">{children}</div>
        </div>
    </div>
);

const BentoTitle = ({ icon: Icon, title, body }: { icon: React.FC<{ className?: string }>; title: string; body: string }) => (
    <>
        <FeaturedIcon
            icon={Icon}
            size="md"
            color="brand"
            theme="modern"
            className="mb-7 border-brand-300/25 bg-brand-300/10 text-brand-200"
        />
        <h3 className="max-w-md text-[1.4rem] font-semibold leading-snug tracking-tight text-white">{title}</h3>
        <p className="mt-2.5 max-w-xl text-pretty text-[0.95rem] leading-7 text-gray-400">{body}</p>
    </>
);

/* Bento visual — open-source repo "card", with stat lines + meta. Featured on the wide card. */
const RepoVisual = () => (
    <div className="mt-auto pt-10">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-white/[0.08] text-brand-300">
                        <Code02 className="size-4" aria-hidden="true" />
                    </span>
                    <p className="font-mono text-[0.78rem] text-gray-300">EricJamesCrow / smartpockets</p>
                </div>
                <span className="font-mono text-[0.7rem] text-gray-500 tabular-nums">main · MIT</span>
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-3 text-[0.78rem] tabular-nums" role="list">
                <li>
                    <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-gray-500">stars</p>
                    <p className="mt-1 text-base font-semibold text-white">214</p>
                </li>
                <li>
                    <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-gray-500">issues</p>
                    <p className="mt-1 text-base font-semibold text-white">37</p>
                </li>
                <li>
                    <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-gray-500">last commit</p>
                    <p className="mt-1 text-base font-semibold text-white">2h ago</p>
                </li>
            </ul>
        </div>
    </div>
);

/* Bento visual — utilization bars, plays well in narrow card */
const UtilizationVisual = () => {
    const rows = [
        { label: "Daily drivers", percent: 38, color: "bg-brand-400" },
        { label: "Travel", percent: 64, color: "bg-amber-300" },
        { label: "Business", percent: 22, color: "bg-sky-300" },
    ];
    return (
        <div className="mt-auto space-y-3 pt-8">
            {rows.map((row) => (
                <div key={row.label}>
                    <div className="flex items-center justify-between text-[0.78rem] text-gray-300">
                        <span>{row.label}</span>
                        <span className="font-mono text-gray-400 tabular-nums">{row.percent}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                        <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.percent}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
};

/* Bento visual — agent timeline */
const AgentTimelineVisual = () => {
    const items = [
        { time: "08:14", note: "Flagged unusual utilization on Capital One Venture" },
        { time: "10:02", note: "Drafted reminder for Chase Sapphire — $342.18 due Sun" },
        { time: "12:48", note: "Suggested moving Amex Blue into the Travel wallet" },
    ];
    return (
        <div className="mt-auto space-y-2.5 pt-8">
            {items.map((item) => (
                <div key={item.time} className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-2.5">
                    <span className="mt-0.5 font-mono text-[0.7rem] text-brand-300 tabular-nums">{item.time}</span>
                    <p className="text-[0.85rem] leading-5 text-gray-300">{item.note}</p>
                </div>
            ))}
        </div>
    );
};

/* Bento visual — privacy / data ownership glyph */
const PrivacyVisual = () => (
    <div className="mt-auto pt-8">
        <div className="grid grid-cols-3 gap-2.5">
            {[
                { label: "no ads", icon: Lock04 },
                { label: "your keys", icon: Database02 },
                { label: "open license", icon: Code02 },
            ].map((item) => (
                <div
                    key={item.label}
                    className="flex flex-col items-start gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3 py-3"
                >
                    <item.icon className="size-3.5 text-brand-300" aria-hidden="true" />
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-gray-400">{item.label}</span>
                </div>
            ))}
        </div>
    </div>
);

const bentoCards = [
    {
        title: "Open source by default. Forkable, auditable, self-hostable.",
        body: "The hosted alpha covers real API costs. If you want full control, fork the repo, drop in your own keys, and run the whole stack on your own infrastructure.",
        icon: Code02,
        className: "lg:col-span-7 lg:row-span-2",
        visual: <RepoVisual />,
        eyebrow: "01 · build",
    },
    {
        title: "Built around the cards you actually carry.",
        body: "Balances, APRs, due dates, utilization, and transactions stay attached to each individual card — not buried in a generic transaction feed.",
        icon: CreditCard02,
        className: "lg:col-span-5 lg:row-span-1",
        visual: <UtilizationVisual />,
        eyebrow: "02 · cards",
    },
    {
        title: "Agent-assisted hygiene, not auto-pilot.",
        body: "SmartPockets surfaces patterns: high-utilization streaks, neglected wallets, due-date risk. You stay in control of every decision and every dollar.",
        icon: Stars02,
        className: "lg:col-span-5 lg:row-span-2",
        visual: <AgentTimelineVisual />,
        eyebrow: "03 · agent",
    },
    {
        title: "Privacy-respecting by architecture, not policy.",
        body: "Plaid data flows into a product designed for visibility and ownership. No advertising, no opaque aggregation, no vendor lock-in on your financial history.",
        icon: Lock04,
        className: "lg:col-span-7 lg:row-span-1",
        visual: <PrivacyVisual />,
        eyebrow: "04 · privacy",
    },
];

/* ──────────────────────────────────────────────────────────────────────────
   Agentic split section — text + contained mockup. The mockup is a
   wallet-hygiene panel with a single assistant note and two cards positioned
   2D, all inside a clipped surface.
   ────────────────────────────────────────────────────────────────────────── */

const AgenticMockup = () => (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-1.5 shadow-[0_30px_100px_-30px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div className="relative aspect-[5/6] overflow-hidden rounded-[calc(2rem-0.375rem)] bg-[#06100c] p-5 sm:aspect-[16/12] md:p-7">
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(34,211,141,0.20),transparent_36%),radial-gradient(circle_at_8%_82%,rgba(180,213,200,0.10),transparent_30%)]"
            />

            {/* assistant note */}
            <div className="sp-agent-card relative z-30 max-w-md rounded-3xl border border-white/[0.08] bg-black/55 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-full border border-brand-300/30 bg-brand-300/10">
                        <Stars02 className="size-3.5 text-brand-200" aria-hidden="true" />
                    </span>
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-brand-200">assistant note · 09:42</p>
                </div>
                <p className="mt-3 text-pretty text-[1.05rem] font-medium leading-snug text-white">
                    Three cards in <span className="text-brand-200">Travel</span> are within 4% of the same utilization threshold.
                </p>
                <p className="mt-2 text-[0.85rem] leading-6 text-gray-400">
                    Review balances before next statement close. SmartPockets tracks the context, you make the move.
                </p>
                <div className="mt-4 flex items-center gap-2">
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-[0.78rem] font-medium text-white ring-1 ring-white/10 transition-colors duration-200 hover:bg-white/[0.10]"
                    >
                        Review wallet
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center rounded-full px-3 py-1.5 text-[0.78rem] font-medium text-gray-400 transition-colors duration-200 hover:text-white"
                    >
                        Dismiss
                    </button>
                </div>
            </div>

            {/* cards */}
            <div className="sp-agent-card absolute bottom-[18%] right-[-4%] z-10 w-[58%] max-w-xs rotate-[6deg] sm:bottom-8 sm:right-8">
                <CreditCard type="transparent-gradient" brand="visa" cardHolder="TRAVEL WALLET" />
            </div>
            <div className="sp-agent-card absolute bottom-[8%] left-4 z-20 w-[54%] max-w-64 -rotate-[8deg] sm:bottom-7 sm:left-8">
                <CreditCard type="gray-dark" brand="mastercard" cardHolder="DAILY WALLET" />
            </div>

            {/* mini hygiene meter */}
            <div className="sp-agent-card absolute right-5 top-6 z-10 hidden w-44 rounded-3xl border border-white/[0.08] bg-white/[0.05] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md sm:block">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-gray-400">card hygiene</p>
                <div className="mt-3.5 space-y-2.5">
                    <div className="h-1.5 rounded-full bg-brand-300/80" />
                    <div className="h-1.5 w-4/5 rounded-full bg-white/[0.18]" />
                    <div className="h-1.5 w-2/3 rounded-full bg-white/[0.12]" />
                </div>
                <p className="mt-3 text-[0.78rem] font-medium text-white">3 of 5 wallets healthy</p>
            </div>
        </div>
    </div>
);

const revealCopy = "Assistance for spotting patterns, organizing wallets, and reminding you when something needs attention. You stay in control of every move, every transfer, every decision.";

/* ──────────────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────────────── */

export default function HomePage() {
    const pageRef = useRef<HTMLDivElement>(null);
    const agentRef = useRef<HTMLElement>(null);
    const revealWords = revealCopy.split(" ");

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
        const media = gsap.matchMedia();

        media.add("(prefers-reduced-motion: no-preference)", () => {
            const context = gsap.context(() => {
                // Hero stagger-in on mount
                gsap.fromTo(
                    ".sp-hero-in",
                    { y: 26, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.85, stagger: 0.07, ease: "power3.out" },
                );

                // Wallet stage cards float in slightly delayed (hero is already in view)
                gsap.fromTo(
                    ".sp-stage-card",
                    { y: 24, scale: 0.96, opacity: 0 },
                    {
                        y: 0,
                        scale: 1,
                        opacity: 1,
                        duration: 0.85,
                        stagger: 0.1,
                        delay: 0.25,
                        ease: "power3.out",
                    },
                );

                // Agentic section: scroll-scrubbed scale/opacity for cards
                gsap.fromTo(
                    ".sp-agent-card",
                    { y: 38, scale: 0.88, opacity: 0.4 },
                    {
                        y: 0,
                        scale: 1,
                        opacity: 1,
                        stagger: 0.12,
                        scrollTrigger: {
                            trigger: agentRef.current,
                            start: "top 78%",
                            end: "bottom 38%",
                            scrub: 0.8,
                        },
                    },
                );

                // Reveal-word color along the agentic copy
                gsap.to(".sp-reveal-word", {
                    color: "rgb(255 255 255)",
                    opacity: 1,
                    stagger: 0.05,
                    scrollTrigger: {
                        trigger: agentRef.current,
                        start: "top 78%",
                        end: "center center",
                        scrub: true,
                    },
                });

                // Bento cards: gentle reveal once they enter the viewport.
                // Each card is its own trigger so cards reveal as they pass the threshold,
                // and we keep an `immediateRender: false` initial state so cards stay
                // fully visible if JS hasn't booted yet (no flash of invisible content).
                gsap.utils.toArray<HTMLElement>(".sp-bento-card").forEach((card) => {
                    gsap.fromTo(
                        card,
                        { y: 24, opacity: 0 },
                        {
                            y: 0,
                            opacity: 1,
                            duration: 0.75,
                            ease: "power3.out",
                            immediateRender: false,
                            scrollTrigger: {
                                trigger: card,
                                start: "top 92%",
                                toggleActions: "play none none reverse",
                            },
                        },
                    );
                });
            }, pageRef);

            return () => context.revert();
        });

        return () => media.revert();
    }, []);

    return (
        <div ref={pageRef} className="relative isolate overflow-hidden bg-[#05070a]">
            {/* fixed grain overlay */}
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] [background-image:radial-gradient(rgba(255,255,255,0.85)_1px,transparent_1px)] [background-size:5px_5px] mix-blend-screen"
            />
            {/* hero ambient gradient */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[40rem] bg-[radial-gradient(circle_at_18%_14%,rgba(34,211,141,0.18),transparent_36%),radial-gradient(circle_at_82%_8%,rgba(180,213,200,0.08),transparent_32%)]"
            />

            {/* HERO */}
            <section className="relative z-10 px-4 pb-16 pt-12 sm:px-6 md:pb-24 md:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
                <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:gap-16">
                    <div className="relative">
                        <div className="sp-hero-in">
                            <Eyebrow number="00">An open-source money OS</Eyebrow>
                        </div>
                        <h1 className="sp-hero-in mt-6 max-w-4xl text-balance text-[clamp(2.6rem,5.4vw,5.4rem)] font-semibold leading-[0.95] tracking-[-0.02em] text-white">
                            Personal finance, finally{" "}
                            <span className="relative inline-block align-middle">
                                <span
                                    className="relative z-10 italic font-medium text-brand-200"
                                    style={{ fontFamily: "var(--font-space-grotesk)" }}
                                >
                                    forkable
                                </span>
                                <span aria-hidden="true" className="absolute -bottom-1 left-0 right-0 h-[6px] bg-brand-400/25 blur-sm" />
                            </span>
                            .
                        </h1>
                        <p className="sp-hero-in mt-7 max-w-xl text-pretty text-[1.05rem] leading-7 text-gray-400 sm:text-[1.125rem] sm:leading-8">
                            SmartPockets is the open-source alternative to YNAB and Monarch — built credit-card-first by someone juggling 12+ cards, with the
                            full stack designed for ownership, agent-assisted hygiene, and zero subscription games.
                        </p>

                        <div className="sp-hero-in mt-9">
                            <MarketingEmailForm idPrefix="hero-waitlist" />
                        </div>

                        <div className="sp-hero-in mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.85rem] font-medium text-gray-400">
                            <a
                                href="/sign-up"
                                className="outline-focus-ring inline-flex items-center gap-1.5 rounded-full text-white transition-colors duration-200 hover:text-brand-200 focus-visible:outline-2 focus-visible:outline-offset-4"
                            >
                                <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-400" />
                                Join with Clerk
                            </a>
                            <span aria-hidden="true" className="h-3 w-px bg-white/10" />
                            <a
                                href="https://github.com/EricJamesCrow/smartpockets"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="outline-focus-ring inline-flex items-center gap-1.5 rounded-full transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
                            >
                                Inspect the repo
                                <ArrowUpRight aria-hidden="true" className="size-3.5" />
                            </a>
                        </div>
                    </div>

                    <div className="sp-hero-in">
                        <WalletStage />
                    </div>
                </div>
            </section>

            {/* STAT STRIP */}
            <StatStrip />

            {/* BENTO */}
            <SectionShell id="features" className="sp-bento">
                <div className="mb-12 grid gap-8 md:mb-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-16">
                    <div>
                        <Eyebrow number="01">The product</Eyebrow>
                        <h2 className="mt-5 max-w-2xl text-balance text-[clamp(2.1rem,4.4vw,4rem)] font-semibold leading-[0.98] tracking-[-0.02em] text-white">
                            Built for people whose finances{" "}
                            <span className="text-gray-400">do not fit in a starter template.</span>
                        </h2>
                    </div>
                    <p className="max-w-xl text-pretty text-[1.05rem] leading-8 text-gray-400">
                        The first job is not budgeting theatrics. It is giving card-heavy spenders a reliable place to see what is connected, what changed, and
                        what needs attention — before agentic features ever get added on top.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-3.5 lg:grid-flow-dense lg:auto-rows-[10rem] lg:grid-cols-12 lg:grid-rows-3 lg:gap-4">
                    {bentoCards.map((card) => (
                        <GlassCard key={card.title} className={`sp-bento-card ${card.className ?? ""}`}>
                            <p className="mb-4 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-gray-500">{card.eyebrow}</p>
                            <BentoTitle icon={card.icon} title={card.title} body={card.body} />
                            {card.visual}
                        </GlassCard>
                    ))}
                </div>
            </SectionShell>

            {/* AGENTIC */}
            <SectionShell id="agentic" refProp={agentRef} className="lg:py-36">
                <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16">
                    <div>
                        <Eyebrow number="02">Roadmap</Eyebrow>
                        <h2 className="mt-5 max-w-3xl text-balance text-[clamp(2.2rem,4.6vw,4.4rem)] font-semibold leading-[0.96] tracking-[-0.02em] text-white">
                            Built for the moment finance starts{" "}
                            <span className="italic font-medium text-brand-200" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                                helping back.
                            </span>
                        </h2>
                        <p className="mt-7 max-w-xl text-pretty text-[1.05rem] leading-8">
                            {revealWords.map((word, index) => (
                                <span
                                    key={`${word}-${index}`}
                                    className="sp-reveal-word inline-block text-gray-500 motion-reduce:text-gray-300"
                                    style={{ marginRight: "0.28em" }}
                                >
                                    {word}
                                </span>
                            ))}
                        </p>

                        <ul className="mt-8 grid gap-3 text-[0.95rem] text-gray-300 sm:grid-cols-2" role="list">
                            {[
                                { icon: BarLineChart, label: "Pattern detection across wallets" },
                                { icon: Zap, label: "Smart due-date reminders" },
                                { icon: BarChart04, label: "Utilization-based hygiene scoring" },
                                { icon: Stars02, label: "Action suggestions, never auto-trades" },
                            ].map((item) => (
                                <li key={item.label} className="flex items-center gap-3">
                                    <span className="flex size-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-brand-300">
                                        <item.icon className="size-3.5" aria-hidden="true" />
                                    </span>
                                    <span>{item.label}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <AgenticMockup />
                </div>
            </SectionShell>

            {/* CTA */}
            <SectionShell id="cta" className="pb-28 pt-4 md:pb-36">
                <div className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-1.5 shadow-[0_30px_120px_-30px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <div className="relative overflow-hidden rounded-[calc(2rem-0.375rem)] bg-[#070d0b] px-6 py-12 sm:px-10 md:px-12 lg:px-16 lg:py-16">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(34,211,141,0.18),transparent_36%),radial-gradient(circle_at_88%_10%,rgba(255,255,255,0.10),transparent_30%)]"
                        />
                        <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_0.92fr] lg:items-end lg:gap-16">
                            <div>
                                <Eyebrow number="03">Early access</Eyebrow>
                                <h2 className="mt-5 max-w-3xl text-balance text-[clamp(2.2rem,4.4vw,4.2rem)] font-semibold leading-[0.96] tracking-[-0.02em] text-white">
                                    Help shape the finance app a power user can actually trust.
                                </h2>
                                <p className="mt-6 max-w-xl text-pretty text-[1.025rem] leading-7 text-gray-400">
                                    The alpha is focused on credit-card visibility first. Broader open-source personal finance, careful agent-assisted features
                                    layered on top — that is the road.
                                </p>
                            </div>

                            <div className="rounded-[1.5rem] border border-white/[0.08] bg-black/30 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                <MarketingEmailForm idPrefix="cta-waitlist" submitLabel="Join the waitlist" />
                                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[0.85rem] text-gray-400">
                                    <a
                                        href="/privacy"
                                        className="outline-focus-ring rounded-full transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
                                    >
                                        Privacy
                                    </a>
                                    <a
                                        href="/terms"
                                        className="outline-focus-ring rounded-full transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
                                    >
                                        Terms
                                    </a>
                                    <a
                                        href="https://github.com/EricJamesCrow/smartpockets"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="outline-focus-ring inline-flex items-center gap-1 rounded-full transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
                                    >
                                        GitHub
                                        <ArrowUpRight aria-hidden="true" className="size-3" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* secondary actions row */}
                        <div className="relative z-10 mt-10 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-6">
                            <Button
                                href="/sign-up"
                                size="lg"
                                className="rounded-full bg-white text-gray-950 hover:bg-brand-50"
                            >
                                Join with Clerk
                            </Button>
                            <Button
                                href="https://github.com/EricJamesCrow/smartpockets"
                                target="_blank"
                                rel="noopener noreferrer"
                                color="secondary"
                                size="lg"
                                iconTrailing={ArrowUpRight}
                                className="rounded-full border-white/10 bg-white/[0.04] text-white ring-white/10 hover:bg-white/[0.10]"
                            >
                                Inspect the repo
                            </Button>
                        </div>
                    </div>
                </div>
            </SectionShell>
        </div>
    );
}
