"use client";

import type { FormEvent } from "react";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { CreditCard } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";
import { ArrowRight, ArrowUpRight } from "@untitledui/icons";
import { Grain } from "@/components/marketing/grain";
import { Reveal, Stagger } from "@/components/marketing/reveal";

const handleProtoSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.currentTarget.reset();
};

/* ──────────────────────────────────────────────────────────────────
 * Hero — Issue No. 04 / 2026
 *  - Asymmetric grid (7 / 5 split)
 *  - Display serif headline anchors the page
 *  - Card mockups contained in a glass plate, slow rotation
 * ────────────────────────────────────────────────────────────────── */

const Hero = () => {
    return (
        <section className="relative isolate overflow-hidden">
            {/* Ambient gradient */}
            <div
                aria-hidden="true"
                className="absolute -top-40 left-1/2 -z-10 h-[640px] w-[1100px] -translate-x-1/2 opacity-50 blur-3xl"
                style={{
                    background:
                        "radial-gradient(60% 50% at 30% 40%, rgba(22, 179, 100, 0.18), transparent 70%), radial-gradient(40% 40% at 75% 60%, rgba(80, 96, 124, 0.18), transparent 70%)",
                }}
            />

            <div className="max-w-container relative mx-auto px-4 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32 lg:pt-32 lg:pb-44">
                {/* Editorial metadata strip */}
                <Reveal>
                    <div className="grid grid-cols-2 items-end gap-y-3 border-b border-white/[0.07] pb-6 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-white/45 sm:grid-cols-4">
                        <span>SmartPockets</span>
                        <span>Issue 04 · 2026</span>
                        <span className="hidden sm:inline">A field guide</span>
                        <span className="text-right">04 / 27</span>
                    </div>
                </Reveal>

                <div className="mt-12 grid grid-cols-1 gap-y-16 md:mt-20 lg:grid-cols-12 lg:gap-x-12">
                    <div className="lg:col-span-7 lg:pr-6">
                        <Reveal delay={0.1}>
                            <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-brand-500">
                                <span className="mr-3 inline-block h-px w-6 align-middle bg-brand-500/60" />
                                A note from the workshop
                            </p>
                        </Reveal>

                        <Reveal delay={0.18} duration={1.4}>
                            <h1
                                className="mt-8 font-[family-name:var(--font-source-serif)] text-[44px] font-light leading-[0.96] tracking-[-0.025em] text-white text-balance sm:text-[56px] md:text-[76px] lg:text-[96px]"
                            >
                                Personal finance,
                                <br />
                                <span className="italic font-extralight text-white/75">re-issued </span>
                                <span className="text-white">as code.</span>
                            </h1>
                        </Reveal>

                        <Reveal delay={0.4}>
                            <p className="mt-8 max-w-[42ch] text-lg leading-relaxed text-white/65 md:text-xl">
                                SmartPockets is the open source alternative to YNAB and Monarch. It was written by one engineer who got tired of paying a subscription to look at his own bank statements.
                            </p>
                        </Reveal>

                        <Reveal delay={0.6}>
                            <Form
                                onSubmit={handleProtoSubmit}
                                className="mt-10 flex w-full max-w-lg flex-col items-stretch gap-3 sm:flex-row sm:items-start"
                            >
                                <Input
                                    isRequired
                                    size="md"
                                    name="email"
                                    type="email"
                                    placeholder="you@studio.io"
                                    wrapperClassName="py-0.5 flex-1"
                                    aria-label="Email"
                                />
                                <Button type="submit" size="xl" iconTrailing={ArrowRight}>
                                    Request access
                                </Button>
                            </Form>
                            <p className="mt-4 text-xs text-white/40">
                                Closed alpha. We add roughly 12 readers a week. No marketing emails.
                            </p>
                        </Reveal>
                    </div>

                    {/* Card glass plate — asymmetric, contained */}
                    <Reveal delay={0.45} className="lg:col-span-5">
                        <div className="relative">
                            {/* Editorial side note */}
                            <div className="absolute -top-3 left-0 z-10 hidden font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.22em] text-white/40 lg:block">
                                Plate I · Twelve cards
                            </div>

                            <div
                                className="relative overflow-hidden rounded-[2px] border border-white/[0.08] p-8 md:p-10"
                                style={{
                                    background:
                                        "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 50%, rgba(22,179,100,0.04) 100%)",
                                    boxShadow:
                                        "0 30px 80px -40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
                                }}
                            >
                                {/* hairline grid */}
                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 opacity-[0.5]"
                                    style={{
                                        backgroundImage:
                                            "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
                                        backgroundSize: "32px 32px",
                                    }}
                                />

                                <div className="relative h-[440px] md:h-[520px]">
                                    <div
                                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                                        style={{ transform: "translate(-50%, -50%) rotate(-14deg)" }}
                                    >
                                        <div className="flex flex-col gap-3">
                                            <div className="flex translate-x-6 gap-3">
                                                <CreditCard type="gray-dark" cardHolder="Eric Crow" width={232} />
                                                <CreditCard type="brand-dark" cardHolder="Eric Crow" width={232} />
                                            </div>
                                            <div className="flex gap-3">
                                                <CreditCard type="gradient-strip-vertical" cardHolder="Eric Crow" width={232} />
                                                <CreditCard type="gray-dark" cardHolder="Eric Crow" width={232} />
                                            </div>
                                            <div className="flex translate-x-12 gap-3">
                                                <CreditCard type="brand-dark" cardHolder="Eric Crow" width={232} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* edge fade */}
                                    <div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-0"
                                        style={{
                                            background:
                                                "radial-gradient(ellipse at center, transparent 30%, rgba(11,12,14,0.85) 80%)",
                                        }}
                                    />
                                </div>

                                <div className="relative mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.2em] text-white/40">
                                    <span>Wallet · Daily drivers</span>
                                    <span className="text-brand-500/80">All synced</span>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
};

/* ──────────────────────────────────────────────────────────────────
 * By the numbers — editorial pull-quote treatment
 * ────────────────────────────────────────────────────────────────── */

const ByTheNumbers = () => {
    const figures = [
        { value: "12.7K", label: "Cards tracked across alpha households" },
        { value: "$0.00", label: "Monthly upcharge above real Plaid cost" },
        { value: "47.2%", label: "Median utilization improvement, 90 days" },
        { value: "1.2s", label: "Average sync latency, household to dashboard" },
    ];

    return (
        <section className="relative border-y border-white/[0.06] py-20 md:py-32">
            <div className="max-w-container mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 gap-x-12 gap-y-12 lg:grid-cols-12">
                    <div className="lg:col-span-4 lg:pt-2">
                        <Reveal>
                            <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/45">
                                Figure 02
                            </p>
                            <h2 className="mt-6 font-[family-name:var(--font-source-serif)] text-4xl font-light leading-[1.05] tracking-tight text-white md:text-5xl">
                                By the numbers, <span className="italic text-white/60">first quarter.</span>
                            </h2>
                            <p className="mt-6 max-w-sm text-base leading-relaxed text-white/55">
                                A small, opinionated audience and a refusal to charge extra for a feature flag. What that looks like in raw numbers.
                            </p>
                        </Reveal>
                    </div>

                    <div className="lg:col-span-8">
                        <Stagger
                            stagger={0.14}
                            className="grid grid-cols-1 sm:grid-cols-2"
                        >
                            {figures.map((fig, i) => (
                                <div
                                    key={fig.label}
                                    className={`flex flex-col justify-between border-white/[0.07] py-8 pr-6 ${
                                        i % 2 === 0 ? "sm:border-r" : ""
                                    } ${i < 2 ? "sm:border-b" : ""} ${i === 0 ? "border-t" : ""} ${
                                        i === 1 ? "sm:border-t" : "border-t"
                                    }`}
                                >
                                    <p
                                        className="font-[family-name:var(--font-source-serif)] text-6xl font-extralight leading-none tracking-tight text-white tabular-nums md:text-7xl"
                                        style={{ fontVariantNumeric: "tabular-nums" }}
                                    >
                                        {fig.value}
                                    </p>
                                    <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/55">
                                        {fig.label}
                                    </p>
                                </div>
                            ))}
                        </Stagger>
                    </div>
                </div>
            </div>
        </section>
    );
};

/* ──────────────────────────────────────────────────────────────────
 * Three pull quotes — editorial column lead
 * ────────────────────────────────────────────────────────────────── */

const PullQuoteEssay = () => {
    return (
        <section className="relative py-24 md:py-36">
            <div className="max-w-container mx-auto px-4 md:px-8">
                <Reveal>
                    <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/45">
                        Essay 01 · The thesis
                    </p>
                </Reveal>

                <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-16 lg:grid-cols-12">
                    <Reveal className="lg:col-span-7" delay={0.1}>
                        <h2
                            className="font-[family-name:var(--font-source-serif)] text-[40px] font-light leading-[1.05] tracking-tight text-white md:text-[64px]"
                        >
                            <span className="text-white/60">A budgeting app</span> should not feel like an interrogation, a paywall, or a TED talk about avocado toast.
                        </h2>
                    </Reveal>

                    <div className="lg:col-span-5 lg:pl-8">
                        <Stagger className="space-y-12" stagger={0.18}>
                            <article>
                                <p className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.2em] text-brand-500/80">
                                    § 01 — Ownership
                                </p>
                                <p className="mt-4 font-[family-name:var(--font-source-serif)] text-xl font-light leading-relaxed text-white/85">
                                    Your data sits in a Convex deployment we host, or a Convex deployment <em className="text-white">you</em> host. Both are valid answers.
                                </p>
                            </article>
                            <article>
                                <p className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.2em] text-brand-500/80">
                                    § 02 — Restraint
                                </p>
                                <p className="mt-4 font-[family-name:var(--font-source-serif)] text-xl font-light leading-relaxed text-white/85">
                                    No streaks. No badges. No little robot telling you to brew coffee at home. Just the numbers, presented with care.
                                </p>
                            </article>
                            <article>
                                <p className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.2em] text-brand-500/80">
                                    § 03 — Speed
                                </p>
                                <p className="mt-4 font-[family-name:var(--font-source-serif)] text-xl font-light leading-relaxed text-white/85">
                                    Plaid webhooks land in Convex, the dashboard updates in under two seconds. The kind of UX you only get from owning the stack.
                                </p>
                            </article>
                        </Stagger>
                    </div>
                </div>
            </div>
        </section>
    );
};

/* ──────────────────────────────────────────────────────────────────
 * Specimen — single hero card with editorial column annotations
 * ────────────────────────────────────────────────────────────────── */

const Specimen = () => {
    return (
        <section className="relative border-y border-white/[0.06] bg-[#0a0b0d] py-24 md:py-36">
            <div className="max-w-container mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 gap-x-16 gap-y-16 lg:grid-cols-12">
                    <Reveal className="lg:col-span-5">
                        <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/45">
                            Specimen 03
                        </p>
                        <h2 className="mt-6 font-[family-name:var(--font-source-serif)] text-4xl font-light leading-[1.05] tracking-tight text-white md:text-5xl text-balance">
                            <span className="text-white/60">A wallet,</span> annotated.
                        </h2>
                        <p className="mt-6 max-w-md text-base leading-relaxed text-white/55">
                            Each card in your dashboard is its own document — APR, due date, lock state, autopay, utilization curve. Pinned, grouped, drag-orderable. No marketing screenshot has ever explained this well.
                        </p>

                        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-white/[0.07] pt-8">
                            {[
                                { k: "Cards in alpha", v: "12.7K" },
                                { k: "Median wallets / user", v: "3.4" },
                                { k: "Plaid sync window", v: "1.2s" },
                                { k: "Lock + autopay coverage", v: "100%" },
                            ].map((row) => (
                                <div key={row.k}>
                                    <dt className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.2em] text-white/40">
                                        {row.k}
                                    </dt>
                                    <dd
                                        className="mt-2 font-[family-name:var(--font-source-serif)] text-3xl font-light tabular-nums text-white"
                                        style={{ fontVariantNumeric: "tabular-nums" }}
                                    >
                                        {row.v}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </Reveal>

                    <Reveal className="lg:col-span-7" delay={0.2}>
                        <div className="relative">
                            <div
                                className="relative overflow-hidden rounded-[2px] border border-white/[0.08] p-12 md:p-16"
                                style={{
                                    background:
                                        "linear-gradient(155deg, rgba(255,255,255,0.03) 0%, rgba(22,179,100,0.04) 100%)",
                                    boxShadow:
                                        "0 30px 80px -40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
                                }}
                            >
                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 opacity-[0.4]"
                                    style={{
                                        backgroundImage:
                                            "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px)",
                                        backgroundSize: "48px 48px",
                                    }}
                                />

                                <div className="relative flex justify-center">
                                    <div
                                        className="relative"
                                        style={{ transform: "rotate(-6deg)" }}
                                    >
                                        <CreditCard
                                            type="brand-dark"
                                            cardHolder="Eric Crow"
                                            width={360}
                                        />
                                    </div>
                                </div>

                                {/* Cross hairs / hairline annotations */}
                                <div className="relative mt-10 grid grid-cols-3 border-t border-white/[0.07] pt-5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.2em] text-white/45">
                                    <span>· Sapphire 7281</span>
                                    <span className="text-center">APR 21.49%</span>
                                    <span className="text-right text-brand-500/80">Synced 4:02 PM</span>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
};

/* ──────────────────────────────────────────────────────────────────
 * Reading list — feature catalogue as editorial index
 * ────────────────────────────────────────────────────────────────── */

const Catalogue = () => {
    const items = [
        {
            no: "01",
            title: "Real-time Plaid sync",
            body: "Connect every bank, every card. Balances, APRs, payment due dates, utilization curves — the dashboard reacts to webhooks within two seconds.",
            tag: "Connected",
        },
        {
            no: "02",
            title: "Wallet organization",
            body: "Group cards into wallets like Daily Drivers, Travel, or Business. Pin favorites, drag-reorder, hide a card without losing its history.",
            tag: "Curation",
        },
        {
            no: "03",
            title: "Card detail pages",
            body: "Lock state, autopay status, full transaction history, and a utilization curve plotted against your statement cycle. Per card, every card.",
            tag: "Surveillance",
        },
        {
            no: "04",
            title: "Convex-native data layer",
            body: "Reactive queries top to bottom. No Next.js API routes. The dashboard re-renders the moment a transaction posts, not when you refresh.",
            tag: "Architecture",
        },
        {
            no: "05",
            title: "Self-hostable, fully",
            body: "MIT license. The hosted plan covers Plaid and infrastructure costs. If you would rather pay AWS instead, the docs walk you through it.",
            tag: "Sovereignty",
        },
        {
            no: "06",
            title: "No data brokerage",
            body: "We are not a martech company in disguise. Your transactions never enter an aggregation pipeline. There is no opaque B2B revenue line.",
            tag: "Trust",
        },
    ];

    return (
        <section className="relative py-24 md:py-36">
            <div className="max-w-container mx-auto px-4 md:px-8">
                <Reveal>
                    <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/45">
                        Catalogue 04 · What ships
                    </p>
                    <h2 className="mt-6 max-w-3xl font-[family-name:var(--font-source-serif)] text-4xl font-light leading-[1.05] tracking-tight text-white md:text-6xl text-balance">
                        Six headlines, <span className="italic text-white/60">no marquees.</span>
                    </h2>
                </Reveal>

                <Stagger
                    className="mt-16 grid grid-cols-1 gap-x-12 gap-y-0 sm:grid-cols-2 lg:grid-cols-3"
                    stagger={0.08}
                >
                    {items.map((item) => (
                        <article
                            key={item.no}
                            className="group flex flex-col border-t border-white/[0.07] py-10 transition-colors duration-300 hover:border-white/20"
                        >
                            <div className="flex items-baseline justify-between">
                                <span className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.22em] text-white/40">
                                    No. {item.no}
                                </span>
                                <span className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.22em] text-brand-500/80">
                                    {item.tag}
                                </span>
                            </div>
                            <h3 className="mt-6 font-[family-name:var(--font-source-serif)] text-2xl font-light leading-tight tracking-tight text-white md:text-3xl">
                                {item.title}
                            </h3>
                            <p className="mt-5 max-w-sm flex-1 text-sm leading-relaxed text-white/55">
                                {item.body}
                            </p>
                            <a
                                href="/about"
                                className="mt-8 inline-flex items-center gap-1.5 self-start font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-white/55 outline-focus-ring transition duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                Read entry
                                <ArrowUpRight className="size-3" />
                            </a>
                        </article>
                    ))}
                </Stagger>
            </div>
        </section>
    );
};

/* ──────────────────────────────────────────────────────────────────
 * Pull quote — full-bleed editorial centerpiece
 * ────────────────────────────────────────────────────────────────── */

const PullQuoteCenterpiece = () => {
    return (
        <section className="relative border-y border-white/[0.06] bg-[#0a0b0d] py-32 md:py-48">
            <div className="max-w-container mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 gap-x-12 gap-y-12 lg:grid-cols-12">
                    <Reveal className="lg:col-span-2 lg:pt-3">
                        <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-white/45">
                            Marginalia
                        </p>
                    </Reveal>

                    <Reveal className="lg:col-span-10" delay={0.15} duration={1.4}>
                        <blockquote
                            className="font-[family-name:var(--font-source-serif)] text-[34px] font-light leading-[1.1] tracking-tight text-white md:text-[56px] lg:text-[72px] text-balance"
                        >
                            <span className="text-white/40">&ldquo;</span>I built this because I was tired of paying a monthly subscription to look at my own bank statements. <span className="italic text-white/60">If that resonates,</span> the alpha is open.<span className="text-white/40">&rdquo;</span>
                        </blockquote>
                        <footer className="mt-12 flex items-center gap-4 border-t border-white/[0.07] pt-6">
                            <div className="size-9 rounded-full border border-white/10 bg-gradient-to-br from-white/15 to-white/0" />
                            <div className="flex flex-col font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.22em] text-white/55">
                                <span className="text-white">Eric J. Crow</span>
                                <span className="mt-0.5">Maintainer · CrowDevelopment</span>
                            </div>
                        </footer>
                    </Reveal>
                </div>
            </div>
        </section>
    );
};

/* ──────────────────────────────────────────────────────────────────
 * Subscribe — quiet sign-off, no megaphone
 * ────────────────────────────────────────────────────────────────── */

const Subscribe = () => {
    return (
        <section className="relative py-24 md:py-36">
            <div className="max-w-container mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 gap-x-12 gap-y-14 lg:grid-cols-12">
                    <Reveal className="lg:col-span-6">
                        <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-brand-500">
                            <span className="mr-3 inline-block h-px w-6 align-middle bg-brand-500/60" />
                            Closing
                        </p>
                        <h2 className="mt-8 font-[family-name:var(--font-source-serif)] text-[44px] font-light leading-[1.0] tracking-tight text-white md:text-[72px] text-balance">
                            Stay <span className="italic text-white/60">close to the work.</span>
                        </h2>
                        <p className="mt-8 max-w-md text-base leading-relaxed text-white/55">
                            One letter a fortnight. Patch notes from the workshop, an occasional essay on personal finance UX, and the alpha invitation when your turn comes up.
                        </p>
                    </Reveal>

                    <Reveal className="lg:col-span-6 lg:pl-8" delay={0.2}>
                        <div
                            className="relative overflow-hidden rounded-[2px] border border-white/[0.08] p-8 md:p-12"
                            style={{
                                background:
                                    "linear-gradient(155deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 60%, rgba(22,179,100,0.05) 100%)",
                                boxShadow:
                                    "0 30px 80px -40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
                            }}
                        >
                            <p className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.22em] text-white/45">
                                Letter from the workshop
                            </p>
                            <p className="mt-3 font-[family-name:var(--font-source-serif)] text-xl font-light leading-relaxed text-white/85">
                                Add yourself to the readership. We add roughly twelve readers a week, on a first-come-first-served basis.
                            </p>

                            <Form
                                onSubmit={handleProtoSubmit}
                                className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-start"
                            >
                                <Input
                                    isRequired
                                    size="md"
                                    name="email"
                                    type="email"
                                    placeholder="you@studio.io"
                                    wrapperClassName="py-0.5 flex-1"
                                    aria-label="Email address"
                                />
                                <Button type="submit" size="xl">
                                    Subscribe
                                </Button>
                            </Form>
                            <p className="mt-4 text-xs text-white/40">
                                By subscribing you accept our{" "}
                                <a
                                    href="/privacy"
                                    className="rounded-xs underline-offset-4 underline outline-focus-ring hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2"
                                >
                                    privacy policy
                                </a>
                                .
                            </p>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
};

/* ──────────────────────────────────────────────────────────────────
 * Page composition
 * ────────────────────────────────────────────────────────────────── */

export default function HomePage() {
    return (
        <div className="relative">
            <Grain />
            <Hero />
            <ByTheNumbers />
            <PullQuoteEssay />
            <Specimen />
            <Catalogue />
            <PullQuoteCenterpiece />
            <Subscribe />
        </div>
    );
}
