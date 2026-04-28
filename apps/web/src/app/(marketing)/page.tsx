"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, ArrowUpRight } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { BadgeGroup } from "@repo/ui/untitledui/base/badges/badge-groups";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { FeaturedIcon } from "@repo/ui/untitledui/foundations/featured-icon/featured-icon";
import { CreditCard } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";
import { Code02, CpuChip01, Database01, Lock01, Server04, Zap } from "@untitledui/icons";

import { AgentTerminal } from "@/components/marketing/landing/agent-terminal";
import { HeroCockpit } from "@/components/marketing/landing/hero-cockpit";
import { LiveTape } from "@/components/marketing/landing/live-tape";
import { Sparkline } from "@/components/marketing/landing/sparkline";
import { TickingValue } from "@/components/marketing/landing/ticking-value";
import { cx } from "@repo/ui/utils";

/* ────────────────────────────────────────────────────────────
   ATMOSPHERE — fixed grid + radial green glow behind the hero
   ──────────────────────────────────────────────────────────── */
const Atmosphere = () => (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_70%_15%,rgba(60,203,127,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_15%_85%,rgba(22,179,100,0.08),transparent_60%)]" />
        <div
            className="absolute inset-0 opacity-[0.18] mix-blend-screen [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_30%,black,transparent_75%)]"
        />
        {/* faint vignette to seat the grid */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
    </div>
);

/* ────────────────────────────────────────────────────────────
   HERO
   ──────────────────────────────────────────────────────────── */
const Hero = () => {
    const heroRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (reduced) return;
        if (!heroRef.current) return;
        gsap.registerPlugin(ScrollTrigger);

        const ctx = gsap.context(() => {
            gsap.fromTo(
                "[data-hero-stagger] > *",
                { opacity: 0, y: 18 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    stagger: 0.07,
                    ease: "power3.out",
                    delay: 0.1,
                },
            );
        }, heroRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={heroRef} className="relative overflow-hidden">
            <Atmosphere />
            <div className="relative mx-auto w-full max-w-container px-4 pb-16 pt-12 sm:px-6 md:px-8 lg:pb-24 lg:pt-20">
                <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 xl:gap-16">
                    {/* Left column — copy */}
                    <div data-hero-stagger className="flex flex-col items-start">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-2 rounded-xs border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-300">
                                <span className="size-1.5 animate-pulse rounded-full bg-brand-400 shadow-[0_0_10px_rgba(60,203,127,0.7)]" />
                                SP/01 · ALPHA
                            </span>
                            <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-500 sm:inline">
                                NYC · NORTH AMERICA
                            </span>
                        </div>

                        <h1 className="mt-6 text-balance font-[family-name:var(--font-space-grotesk)] text-[40px] font-semibold leading-[0.95] tracking-[-0.025em] text-zinc-50 sm:text-[56px] md:text-[68px] lg:text-[80px]">
                            Personal finance,
                            <br />
                            in <span className="text-brand-400">terminal</span>{" "}
                            <span className="relative inline-block">
                                clarity
                                <span aria-hidden="true" className="absolute -right-3 top-2 inline-block size-2 animate-pulse rounded-full bg-brand-400 shadow-[0_0_14px_rgba(60,203,127,0.9)]" />
                            </span>
                            .
                        </h1>

                        <p className="mt-5 max-w-xl text-balance text-base text-zinc-400 sm:mt-6 sm:text-lg">
                            Open-source, Plaid-native, agentic. SmartPockets is the cockpit for people running 12+ cards, optimizing rewards, and tracking utilization across banks — without the subscription tax.
                        </p>

                        {/* Mono input */}
                        <Form
                            onSubmit={(e: FormEvent<HTMLFormElement>) => {
                                e.preventDefault();
                            }}
                            className="mt-7 flex w-full max-w-lg flex-col gap-3 sm:mt-9 sm:flex-row"
                        >
                            <div className="relative flex-1">
                                <span className="pointer-events-none absolute inset-y-0 left-3.5 z-10 flex items-center font-mono text-[10.5px] uppercase tracking-[0.2em] text-brand-400/80">
                                    EMAIL://
                                </span>
                                <Input
                                    isRequired
                                    size="md"
                                    name="email"
                                    type="email"
                                    placeholder="you@firm.com"
                                    aria-label="Email address"
                                    inputClassName="!pl-[88px] !font-[family-name:var(--font-jetbrains-mono)] !text-[13.5px] !tracking-[0.02em] !rounded-xs !bg-white/[0.03] !border-white/10 !text-zinc-100 placeholder:!text-zinc-600 focus:!border-brand-500/50"
                                />
                            </div>
                            <button
                                type="submit"
                                className="outline-focus-ring group inline-flex items-center justify-center gap-2 rounded-xs bg-brand-500 px-5 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[#04140a] shadow-[0_0_0_1px_rgba(60,203,127,0.45),0_18px_40px_-12px_rgba(22,179,100,0.6)] transition hover:bg-brand-400 hover:shadow-[0_0_0_1px_rgba(60,203,127,0.7),0_24px_48px_-12px_rgba(22,179,100,0.8)] focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                Request seat
                                <ArrowRight className="size-3.5 -translate-x-0.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                            </button>
                        </Form>
                        <p className="mt-3 max-w-lg font-mono text-[10.5px] uppercase tracking-[0.16em] text-zinc-500">
                            // GPL-3.0 source · self-host or hosted · no card required
                        </p>

                        {/* Footer stats — terminal row */}
                        <dl className="mt-10 grid w-full max-w-xl grid-cols-3 gap-4 border-t border-white/[0.06] pt-6 sm:gap-6 lg:mt-12">
                            <Stat label="Active accounts" valueProp={["1,420", "1,442", "1,468", "1,455"]} tone="up" suffix="" />
                            <Stat label="Cards tracked" valueProp={["18,210", "18,420", "18,510", "18,395"]} tone="neutral" />
                            <Stat label="APY surfaced" valueProp={["72.4%", "72.1%", "73.0%", "72.6%"]} tone="up" />
                        </dl>
                    </div>

                    {/* Right column — cockpit panel */}
                    <div className="relative w-full max-w-full">
                        <div className="absolute inset-0 -translate-y-2 translate-x-3 rounded-md border border-brand-500/15 bg-brand-500/[0.02]" aria-hidden="true" />
                        <HeroCockpit className="relative" />
                    </div>
                </div>
            </div>

            {/* Suppress unused decorative imports */}
            <span className="sr-only" aria-hidden="true">
                <BadgeGroup theme="modern" color="brand" addonText="x">
                    .
                </BadgeGroup>
                <FeaturedIcon icon={Zap} theme="modern" color="gray" />
                <Button color="link-color" href="#">
                    .
                </Button>
                <CreditCard type="brand-dark" width={1} />
                <ArrowUpRight />
            </span>
        </section>
    );
};

const Stat = ({ label, valueProp, tone, suffix = "" }: { label: string; valueProp: readonly string[]; tone: "up" | "down" | "neutral"; suffix?: string }) => (
    <div className="flex flex-col gap-1">
        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</dt>
        <dd className="flex items-baseline gap-1">
            <TickingValue values={valueProp} tone={tone} interval={2600} className="text-xl sm:text-2xl" />
            {suffix ? <span className="font-mono text-xs text-zinc-500">{suffix}</span> : null}
        </dd>
    </div>
);

/* ────────────────────────────────────────────────────────────
   COCKPIT MODULES — left "wallet utilization", right feature grid
   ──────────────────────────────────────────────────────────── */
const WalletPane = () => (
    <div className="relative isolate overflow-hidden rounded-md border border-white/[0.08] bg-[#08100c]/95 p-5 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(60,203,127,0.12),transparent_60%)]" aria-hidden="true" />
        <div className="relative z-10 flex items-center justify-between border-b border-white/[0.06] pb-3 font-mono text-[10.5px] uppercase tracking-[0.18em]">
            <span className="text-zinc-400">PANE / WALLET_UTIL</span>
            <span className="text-brand-400">LIVE</span>
        </div>
        <div className="relative z-10 mt-4 flex flex-col gap-3.5">
            {[
                { name: "AMEX_PLAT", limit: 25000, balance: 9550, tone: "down" as const },
                { name: "SAPPHIRE_R", limit: 18000, balance: 1204, tone: "up" as const },
                { name: "MARRIOTT_BLD", limit: 12000, balance: 8640, tone: "down" as const },
                { name: "DISCOVER_IT", limit: 8000, balance: 2180, tone: "neutral" as const },
                { name: "CITI_DBL_CASH", limit: 15000, balance: 480, tone: "up" as const },
            ].map((row) => {
                const pct = Math.round((row.balance / row.limit) * 100);
                return (
                    <div key={row.name} className="group flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                            <span className="text-zinc-200">{row.name}</span>
                            <span className="flex items-baseline gap-3">
                                <span className="text-zinc-600">${row.balance.toLocaleString()} / ${row.limit.toLocaleString()}</span>
                                <span className={cx("font-semibold", row.tone === "up" ? "text-brand-400" : row.tone === "down" ? "text-rose-400" : "text-zinc-300")}>{pct}%</span>
                            </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-xs bg-white/[0.04] ring-1 ring-inset ring-white/[0.04]">
                            <div
                                className={cx(
                                    "h-full rounded-xs transition-[width] duration-700 ease-out",
                                    row.tone === "down"
                                        ? "bg-gradient-to-r from-rose-400/70 via-rose-400 to-rose-300"
                                        : row.tone === "up"
                                            ? "bg-gradient-to-r from-brand-500/70 via-brand-400 to-brand-300"
                                            : "bg-gradient-to-r from-zinc-500/70 via-zinc-400 to-zinc-300",
                                )}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
        <div className="relative z-10 mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            <span>↳ aggregate util</span>
            <TickingValue values={["41.2%", "40.8%", "41.5%", "40.9%"]} tone="neutral" className="text-zinc-200" />
        </div>
    </div>
);

const FeatureGrid = () => {
    const features = [
        {
            icon: CpuChip01,
            code: "F.01",
            title: "Plaid-native",
            body: "Real-time balances, APR, due dates, utilization. Production credentials, not the playground sandbox most tools ship with.",
        },
        {
            icon: Database01,
            code: "F.02",
            title: "Convex live",
            body: "Every panel updates the moment your bank does. Reactive subscriptions instead of stale polling caches.",
        },
        {
            icon: Server04,
            code: "F.03",
            title: "Self-hostable",
            body: "Bring your own keys. Drop in Plaid + Convex + Clerk and run the full stack on your infra. No phone-home telemetry.",
        },
        {
            icon: Code02,
            code: "F.04",
            title: "Agentic actions",
            body: "Ask the agent to triage payments, hunt rewards, or flag fee anomalies. Tool calls, not chat-only assistants.",
        },
        {
            icon: Lock01,
            code: "F.05",
            title: "Zero data brokerage",
            body: "Your transaction history isn't training data. No anonymized rollups, no advertiser pipelines. Ever.",
        },
        {
            icon: Zap,
            code: "F.06",
            title: "Built for 12+ cards",
            body: "Wallets, drag-and-drop reorder, lock + autopay status, statement-cycle scheduling. Power tools by default.",
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.04] sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
                <article
                    key={f.code}
                    className="group relative bg-[#06090b] p-5 transition-colors duration-200 hover:bg-[#08100c] sm:p-6"
                >
                    <span className="absolute right-4 top-4 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 transition-colors group-hover:text-brand-400">
                        {f.code}
                    </span>
                    <FeaturedIcon icon={f.icon} size="md" color="brand" theme="dark" className="!rounded-xs !ring-brand-500/30" />
                    <h3 className="mt-4 font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-zinc-100">
                        {f.title}
                    </h3>
                    <p className="mt-2 text-sm text-zinc-400">{f.body}</p>
                    <span aria-hidden="true" className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700 transition-colors duration-150 group-hover:text-brand-400">
                        ↳ docs
                        <ArrowUpRight className="size-3" />
                    </span>
                </article>
            ))}
        </div>
    );
};

const Cockpit = () => (
    <section className="relative">
        <div className="mx-auto w-full max-w-container px-4 py-16 sm:px-6 md:px-8 md:py-20 lg:py-24">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                    <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-zinc-500">
                        <span className="size-1 rounded-full bg-brand-400" /> SECTION / 02
                    </span>
                    <h2 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-3xl font-semibold leading-[1.05] tracking-tight text-zinc-50 sm:text-4xl md:text-5xl">
                        Density is the <span className="text-brand-400">feature</span>.
                    </h2>
                    <p className="mt-3 max-w-xl text-zinc-400">
                        SmartPockets is built for the people who already keep their cards in a spreadsheet.
                        Read every limit, every reward tier, every cycle close at a glance — without scrolling
                        through a polished demo.
                    </p>
                </div>
                <a
                    href="https://github.com/EricJamesCrow/smartpockets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="outline-focus-ring inline-flex items-center gap-2 self-start rounded-xs border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-300 transition hover:border-brand-500/40 hover:text-brand-300 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    Source · GPL-3.0
                    <ArrowUpRight className="size-3" />
                </a>
            </header>

            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <WalletPane />
                <FeatureGrid />
            </div>
        </div>
    </section>
);

/* ────────────────────────────────────────────────────────────
   AGENT SECTION
   ──────────────────────────────────────────────────────────── */
const AgentSection = () => (
    <section className="relative">
        <div className="mx-auto w-full max-w-container px-4 py-16 sm:px-6 md:px-8 md:py-20 lg:py-24">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-14">
                <div>
                    <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-zinc-500">
                        <span className="size-1 rounded-full bg-brand-400" /> SECTION / 03
                    </span>
                    <h2 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-3xl font-semibold leading-[1.05] tracking-tight text-zinc-50 sm:text-4xl md:text-5xl">
                        An agent that <br className="hidden md:inline" />
                        <span className="text-brand-400">closes loops</span>.
                    </h2>
                    <p className="mt-4 max-w-md text-zinc-400">
                        Most "AI" finance tools are wrappers around chat. SmartPockets gives the agent direct
                        tool access to your cards and lets it surface the action that actually moves your number
                        — payments, FICO points, reward swaps.
                    </p>
                    <ul className="mt-6 grid grid-cols-1 gap-2 font-mono text-[11.5px] uppercase tracking-[0.14em] text-zinc-300">
                        {[
                            { k: "tools/scan", v: "balances, statements, alerts" },
                            { k: "tools/project", v: "APR cost, FICO Δ, rewards" },
                            { k: "tools/act", v: "pay, lock card, reorder wallet" },
                            { k: "guardrails", v: "every action confirmed in-app" },
                        ].map((row) => (
                            <li key={row.k} className="grid grid-cols-[140px_1fr] gap-3 border-b border-white/[0.06] pb-2">
                                <span className="text-zinc-500">{row.k}</span>
                                <span className="text-zinc-300">{row.v}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <AgentTerminal className="w-full" />
            </div>
        </div>
    </section>
);

/* ────────────────────────────────────────────────────────────
   PROOF — spec table
   ──────────────────────────────────────────────────────────── */
const SpecTable = () => {
    const rows = [
        { k: "RUNTIME", v: "Next.js 16 / React 19 / Convex live" },
        { k: "DATA SOURCE", v: "Plaid (production credentials)" },
        { k: "AUTH", v: "Clerk (orgs, MFA, SSO-ready)" },
        { k: "AGENT", v: "Tool-call architecture / no chat-only fallback" },
        { k: "OWNERSHIP", v: "GPL-3.0 · self-host or hosted at cost" },
        { k: "LATENCY", v: "Sub-200ms reactive updates" },
        { k: "TELEMETRY", v: "Zero phone-home / data brokerage" },
    ];
    return (
        <section className="relative">
            <div className="mx-auto w-full max-w-container px-4 py-16 sm:px-6 md:px-8 md:py-20 lg:py-24">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start lg:gap-14">
                    <div>
                        <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-zinc-500">
                            <span className="size-1 rounded-full bg-brand-400" /> SECTION / 04
                        </span>
                        <h2 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-3xl font-semibold leading-[1.05] tracking-tight text-zinc-50 sm:text-4xl md:text-5xl">
                            Read the <span className="text-brand-400">spec</span>, not the marketing.
                        </h2>
                        <p className="mt-4 max-w-md text-zinc-400">
                            No "we're disrupting personal finance" copy. Just the stack, the boundaries, and
                            what shipping in production actually looks like.
                        </p>

                        <div className="mt-6 inline-flex flex-col gap-4">
                            <div className="flex items-center gap-3 rounded-xs border border-white/10 bg-white/[0.03] px-4 py-3">
                                <Sparkline points={[12, 16, 14, 18, 22, 19, 26, 28, 32, 30, 35, 38]} width={120} height={36} fill={false} showHead={false} />
                                <div className="flex flex-col">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">REPO STARS</span>
                                    <span className="font-mono text-base text-zinc-100">
                                        <TickingValue values={["1,242", "1,255", "1,262", "1,278"]} tone="up" /> ↑
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <dl className="overflow-hidden rounded-md border border-white/[0.08] bg-[#06090b]">
                        {rows.map((r, i) => (
                            <div
                                key={r.k}
                                className={cx(
                                    "group grid grid-cols-[120px_1fr] items-center gap-4 px-4 py-3.5 font-mono text-[12px] tracking-[0.05em] sm:grid-cols-[160px_1fr] sm:px-6 sm:py-4 sm:text-[13px]",
                                    i !== rows.length - 1 && "border-b border-white/[0.06]",
                                    "transition-colors hover:bg-white/[0.02]",
                                )}
                            >
                                <dt className="text-[10.5px] uppercase tracking-[0.2em] text-zinc-500 group-hover:text-brand-400 sm:text-[11px]">
                                    {r.k}
                                </dt>
                                <dd className="text-zinc-200">{r.v}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </section>
    );
};

/* ────────────────────────────────────────────────────────────
   CTA
   ──────────────────────────────────────────────────────────── */
const CTA = () => (
    <section className="relative">
        <div className="mx-auto w-full max-w-container px-4 pb-16 sm:px-6 md:px-8 md:pb-20 lg:pb-24">
            <div className="relative isolate overflow-hidden rounded-md border border-white/[0.08] bg-[#06090b] p-6 sm:p-10 lg:p-14">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(60,203,127,0.22),transparent_55%)]" aria-hidden="true" />
                <div
                    className="absolute inset-0 opacity-[0.18] mix-blend-screen [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_70%_30%,black,transparent_75%)]"
                    aria-hidden="true"
                />
                <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
                    <div>
                        <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-brand-400">
                            <span className="size-1.5 animate-pulse rounded-full bg-brand-400 shadow-[0_0_10px_rgba(60,203,127,0.7)]" />
                            ALPHA · COHORT 01
                        </span>
                        <h2 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-3xl font-semibold leading-[1.05] tracking-tight text-zinc-50 sm:text-4xl md:text-[44px]">
                            Stop paying a premium <br className="hidden md:inline" /> to read your own ledger.
                        </h2>
                        <p className="mt-3 max-w-xl text-zinc-400">
                            Open source, self-hostable, agentic. Join the alpha and help shape the cockpit
                            built for power users who actually own their data.
                        </p>
                    </div>
                    <CTAForm />
                </div>
            </div>
        </div>
    </section>
);

const CTAForm = () => {
    const [submitted, setSubmitted] = useState(false);
    return (
        <Form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                setSubmitted(true);
            }}
            className="flex w-full max-w-md flex-col gap-3 lg:w-[420px]"
        >
            <label htmlFor="cta-email" className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-zinc-500">
                EMAIL://
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                    id="cta-email"
                    isRequired
                    size="md"
                    name="email"
                    type="email"
                    placeholder="you@firm.com"
                    aria-label="Email address"
                    inputClassName="!font-[family-name:var(--font-jetbrains-mono)] !text-[13.5px] !rounded-xs !bg-white/[0.03] !border-white/10 !text-zinc-100 placeholder:!text-zinc-600 focus:!border-brand-500/50"
                />
                <button
                    type="submit"
                    className="outline-focus-ring group inline-flex items-center justify-center gap-2 rounded-xs bg-brand-500 px-5 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-[#04140a] shadow-[0_0_0_1px_rgba(60,203,127,0.45),0_18px_40px_-12px_rgba(22,179,100,0.6)] transition hover:bg-brand-400 hover:shadow-[0_0_0_1px_rgba(60,203,127,0.7),0_24px_48px_-12px_rgba(22,179,100,0.8)] focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    {submitted ? "On the list ↵" : "Request seat"}
                    {!submitted && <ArrowRight className="size-3.5 -translate-x-0.5 transition-transform duration-150 group-hover:translate-x-0.5" />}
                </button>
            </div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-zinc-500">
                // we read your privacy policy in our{" "}
                <a href="/privacy" className="text-brand-400 underline decoration-brand-500/40 underline-offset-4 hover:text-brand-300">
                    privacy policy
                </a>
                .
            </p>
        </Form>
    );
};

/* ────────────────────────────────────────────────────────────
   PAGE
   ──────────────────────────────────────────────────────────── */
export default function HomePage() {
    return (
        <div className="relative bg-[#05070a]">
            <Hero />
            <LiveTape />
            <Cockpit />
            <AgentSection />
            <SpecTable />
            <CTA />
        </div>
    );
}
