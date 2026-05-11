"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { CreditCard } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";
import { ArrowUpRight, ChartBreakoutSquare, CreditCard02, MessageChatCircle, Zap } from "@untitledui/icons";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const bentoCards = [
    {
        title: "Open source by design",
        description:
            "Inspect every line, fork the architecture, or self-host the entire stack with your own keys. The hosted alpha is a convenience, not a moat.",
        icon: MessageChatCircle,
        className: "lg:col-span-7 lg:row-span-2",
        visual: "repo",
        kicker: "01 / Architecture",
    },
    {
        title: "Composed around cards",
        description: "Balances, utilization, APRs, due dates, and transactions stay attached to the cards you actually carry.",
        icon: CreditCard02,
        className: "lg:col-span-5 lg:row-span-1",
        visual: "cards",
        kicker: "02 / Object model",
    },
    {
        title: "Agent-assisted, never agent-acting",
        description:
            "SmartPockets is moving toward assistance for insight, organization, reminders, and portfolio hygiene. It will not pretend to move money on your behalf.",
        icon: Zap,
        className: "lg:col-span-5 lg:row-span-2",
        visual: "agent",
        kicker: "03 / Direction",
    },
    {
        title: "Privacy-respecting plumbing",
        description: "Plaid data flows into a product built for visibility and ownership, not ad targeting or opaque aggregation.",
        icon: ChartBreakoutSquare,
        className: "lg:col-span-7 lg:row-span-1",
        visual: "privacy",
        kicker: "04 / Data ethic",
    },
];

const marqueeItems = [
    "open-source finance",
    "self-hostable",
    "Plaid-powered sync",
    "Convex-native realtime",
    "agent-assisted, never agent-acting",
    "card-first object model",
    "your keys, your data",
];

const preventPrototypeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.currentTarget.reset();
};

const SectionShell = ({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) => (
    <section id={id} className={`relative px-4 py-24 sm:px-6 md:py-32 lg:px-8 ${className}`}>
        <div className="mx-auto max-w-7xl">{children}</div>
    </section>
);

const Eyebrow = ({ children }: { children: ReactNode }) => (
    <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-stone-300">
        <span className="h-1 w-1 rounded-full bg-[#7fb89a] shadow-[0_0_8px_2px_rgba(127,184,154,0.5)]" />
        {children}
    </p>
);

const SectionRule = ({ children }: { children: string }) => (
    <div className="mb-10 flex items-center gap-4">
        <span className="font-[family-name:var(--font-geist-mono)] text-[0.7rem] uppercase tracking-[0.3em] text-stone-500">{children}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
    </div>
);

const MarketingEmailForm = ({ compact = false, idPrefix }: { compact?: boolean; idPrefix: string }) => (
    <div className="w-full">
        <Form
            onSubmit={preventPrototypeSubmit}
            className={`flex w-full flex-col gap-3 ${compact ? "sm:flex-row" : "md:max-w-xl md:flex-row"}`}
        >
            <Input
                id={`${idPrefix}-email`}
                aria-label="Email address"
                aria-describedby={`${idPrefix}-hint`}
                isRequired
                size="md"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck="false"
                placeholder="you@example.com"
                wrapperClassName="min-h-12 rounded-full border border-white/10 bg-white/[0.05] px-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] focus-within:ring-2 focus-within:ring-[#7fb89a]/40"
                inputClassName="text-stone-100 placeholder:text-stone-500 font-[family-name:var(--font-geist-mono)] text-sm"
            />
            <Button
                id={`${idPrefix}-submit`}
                type="submit"
                size="xl"
                className="min-h-12 rounded-full bg-gradient-to-b from-stone-50 to-stone-200 px-7 text-[#0a1410] shadow-[0_8px_24px_rgba(127,184,154,0.18),inset_0_1px_0_rgba(255,255,255,0.6)] ring-white/30 transition-[background-color,transform,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:from-white hover:to-stone-100 active:scale-[0.98]"
            >
                Request invite
            </Button>
        </Form>
        <p id={`${idPrefix}-hint`} className="mt-3 text-xs uppercase tracking-[0.16em] text-stone-500">
            Prototype waitlist &middot; capture is not yet active
        </p>
    </div>
);

const GlassCard = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
    <div
        className={`group rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-1.5 shadow-[0_24px_90px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl ${className}`}
    >
        <div className="relative flex h-full min-h-64 flex-col overflow-hidden rounded-[calc(2rem-0.375rem)] bg-[#0c1014] p-6 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-1 md:p-8">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(127,184,154,0.16),transparent_36%),radial-gradient(circle_at_85%_5%,rgba(212,197,156,0.10),transparent_30%)]"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:42px_42px]"
            />
            <div className="relative z-10 flex h-full flex-col">{children}</div>
        </div>
    </div>
);

const ContainedWalletMockup = () => (
    <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[2.25rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-2 shadow-[0_40px_120px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[calc(2.25rem-0.5rem)] bg-[#0a1014] sm:aspect-[5/4] lg:aspect-[4/5]">
            <div
                aria-hidden="true"
                className="sp-aurora absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(127,184,154,0.32),transparent_36%),radial-gradient(circle_at_82%_14%,rgba(212,197,156,0.18),transparent_32%),linear-gradient(155deg,rgba(255,255,255,0.06),transparent_46%)]"
            />
            <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(rgba(255,255,255,0.85)_1px,transparent_1px)] [background-size:3px_3px]"
            />

            <div className="absolute left-5 right-5 top-5 overflow-hidden rounded-3xl border border-white/10 bg-black/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl sm:left-7 sm:right-7 sm:top-7">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="font-[family-name:var(--font-geist-mono)] text-[0.65rem] uppercase tracking-[0.22em] text-[#9fbeae]">
                            wallet health
                        </p>
                        <p className="mt-2 font-[family-name:var(--font-fraunces)] text-[2.25rem] font-semibold leading-none tabular-nums tracking-[-0.02em] text-white">
                            $18,420
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="rounded-full border border-[#7fb89a]/25 bg-[#7fb89a]/10 px-3 py-1 font-[family-name:var(--font-geist-mono)] text-xs font-semibold tabular-nums text-[#a3d7bf]">
                            72.4%
                        </span>
                        <span className="text-[0.6rem] uppercase tracking-[0.18em] text-stone-500">utilization</span>
                    </div>
                </div>
            </div>

            <div className="absolute left-5 top-36 w-[72%] rotate-[-9deg] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:rotate-[-5deg] sm:left-9 sm:top-32">
                <CreditCard type="brand-dark" brand="visa" cardHolder="ERIC CROW" cardNumber="4821 3840 1288 9024" />
            </div>
            <div className="absolute right-[-6%] top-56 w-[70%] rotate-[10deg] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:rotate-[6deg] sm:right-4 sm:top-48">
                <CreditCard type="transparent-gradient" brand="amex" cardHolder="ERIC CROW" cardNumber="3791 024801 44712" />
            </div>
            <div className="absolute bottom-10 left-7 w-[66%] rotate-[-2deg] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:rotate-0 sm:bottom-8 sm:left-12">
                <CreditCard type="gray-dark" brand="mastercard" cardHolder="ERIC CROW" cardNumber="5498 9031 2740 1184" />
            </div>

            <div className="absolute bottom-5 right-5 w-44 overflow-hidden rounded-3xl border border-white/10 bg-black/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl">
                <p className="font-[family-name:var(--font-geist-mono)] text-[0.6rem] uppercase tracking-[0.2em] text-stone-400">next reminder</p>
                <p className="mt-2 text-sm font-semibold text-white">Autopay status review</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-[#7fb89a] to-[#d4c59c]" />
                </div>
                <p className="mt-2 text-[0.65rem] uppercase tracking-[0.16em] text-stone-500">3 of 5 cards confirmed</p>
            </div>
        </div>
    </div>
);

const BentoVisual = ({ type }: { type: string }) => {
    if (type === "repo") {
        return (
            <div className="mt-auto pt-10">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/35 font-[family-name:var(--font-geist-mono)] text-[0.78rem] leading-relaxed text-stone-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-4 py-2">
                        <span className="size-2.5 rounded-full bg-[#ff5f57]/70" />
                        <span className="size-2.5 rounded-full bg-[#febc2e]/70" />
                        <span className="size-2.5 rounded-full bg-[#28c840]/70" />
                        <span className="ml-3 text-[0.7rem] uppercase tracking-[0.18em] text-stone-500">~/smartpockets</span>
                    </div>
                    <pre className="px-4 py-3 text-stone-300">
                        <span className="text-[#7fb89a]">$</span> git clone EricJamesCrow/smartpockets{"\n"}
                        <span className="text-[#7fb89a]">$</span> bun install && bun dev{"\n"}
                        <span className="text-stone-500">  ↳ web ready · backend ready</span>
                    </pre>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-stone-300 sm:grid-cols-3">
                    {["Forkable", "Auditable", "Self-host path"].map((item) => (
                        <div
                            key={item}
                            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center font-[family-name:var(--font-geist-mono)] text-[0.7rem] uppercase tracking-[0.16em] text-stone-300"
                        >
                            {item}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (type === "cards") {
        return (
            <div className="relative mt-auto h-44 overflow-hidden pt-4">
                <div className="absolute -top-3 left-2 w-44 rotate-[-9deg]">
                    <CreditCard type="brand-dark" brand="visa" cardHolder="EC" />
                </div>
                <div className="absolute right-2 top-3 w-40 rotate-[7deg]">
                    <CreditCard type="transparent-gradient" brand="amex" cardHolder="EC" />
                </div>
            </div>
        );
    }

    if (type === "agent") {
        return (
            <div className="mt-auto space-y-3 pt-8">
                {[
                    { copy: "Flag unusual utilization changes", tag: "INSIGHT" },
                    { copy: "Suggest wallet cleanup", tag: "ORGANIZATION" },
                    { copy: "Remind before due dates", tag: "RECALL" },
                ].map((item, index) => (
                    <div
                        key={item.copy}
                        className="flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-stone-200"
                    >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[#7fb89a]/25 bg-[#7fb89a]/10 font-[family-name:var(--font-geist-mono)] text-xs font-semibold tabular-nums text-[#a3d7bf]">
                            {index + 1}
                        </span>
                        <span className="flex-1 text-pretty">{item.copy}</span>
                        <span className="hidden font-[family-name:var(--font-geist-mono)] text-[0.6rem] uppercase tracking-[0.16em] text-stone-500 sm:inline">
                            {item.tag}
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="mt-auto grid grid-cols-3 gap-3 pt-8">
            {[
                { item: "no ads", body: "ever" },
                { item: "your keys", body: "self-host" },
                { item: "clear sync", body: "via Plaid" },
            ].map((entry) => (
                <div
                    key={entry.item}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 text-center"
                >
                    <p className="font-[family-name:var(--font-geist-mono)] text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-300">
                        {entry.item}
                    </p>
                    <p className="mt-1 text-[0.65rem] uppercase tracking-[0.14em] text-stone-500">{entry.body}</p>
                </div>
            ))}
        </div>
    );
};

const BentoCard = ({ title, description, icon: Icon, visual, kicker }: (typeof bentoCards)[number]) => (
    <>
        <div className="flex items-center justify-between">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.1] to-white/[0.02] text-stone-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                <Icon aria-hidden="true" className="size-5" />
            </div>
            <span className="font-[family-name:var(--font-geist-mono)] text-[0.65rem] uppercase tracking-[0.22em] text-stone-500">{kicker}</span>
        </div>
        <h3 className="mt-7 max-w-xl font-[family-name:var(--font-inter)] text-[1.7rem] font-medium leading-[1.1] tracking-[-0.025em] text-white">
            {title}
        </h3>
        <p className="mt-3 max-w-2xl text-pretty text-[0.95rem] leading-7 text-stone-400">{description}</p>
        <BentoVisual type={visual} />
    </>
);

const ProofMarquee = () => (
    <div className="relative overflow-hidden border-y border-white/10 bg-white/[0.015] py-5">
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#080a0c] to-transparent"
        />
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#080a0c] to-transparent"
        />
        <div className="sp-marquee flex w-max gap-3 motion-reduce:animate-none">
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
                <span
                    key={`${item}-${index}`}
                    className="flex shrink-0 items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[0.7rem] font-medium uppercase tracking-[0.18em] text-stone-300"
                >
                    <span className="h-1 w-1 rounded-full bg-[#7fb89a]/70" />
                    {item}
                </span>
            ))}
        </div>
    </div>
);

const Manifesto = ({ words }: { words: string[] }) => (
    <SectionShell id="manifesto" className="py-24 md:py-36">
        <SectionRule>I &middot; The position</SectionRule>
        <div className="grid gap-12 lg:grid-cols-[0.4fr_1fr] lg:items-start lg:gap-20">
            <div>
                <Eyebrow>Manifesto</Eyebrow>
                <p className="font-[family-name:var(--font-geist-mono)] text-[0.7rem] uppercase tracking-[0.22em] text-stone-500">
                    Drafted in private &middot; Eric J. Crow
                </p>
            </div>
            <div className="max-w-3xl">
                <p className="font-[family-name:var(--font-fraunces)] text-[clamp(1.6rem,2.4vw,2.4rem)] font-medium italic leading-[1.2] tracking-[-0.012em] text-stone-100">
                    {words.map((word, index) => (
                        <span key={`${word}-${index}`} className="sp-reveal-word inline-block opacity-30 motion-reduce:opacity-100">
                            {word}
                            {index < words.length - 1 ? " " : ""}
                        </span>
                    ))}
                </p>
                <p className="mt-10 max-w-2xl text-pretty text-base leading-7 text-stone-400">
                    SmartPockets does not score your spending or sermonize your habits. It is a careful workshop of your own financial objects, with assistance you can read the source of.
                </p>
            </div>
        </div>
    </SectionShell>
);

const AgenticSection = () => (
    <SectionShell id="agentic" className="py-24 md:py-36">
        <SectionRule>III &middot; The direction</SectionRule>
        <div className="grid gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div>
                <Eyebrow>Future direction</Eyebrow>
                <h2 className="max-w-3xl text-balance font-[family-name:var(--font-inter)] text-[clamp(2.6rem,4.8vw,5.2rem)] font-medium leading-[0.94] tracking-[-0.035em] text-white">
                    Built for the moment finance starts{" "}
                    <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-stone-300">helping</em>{" "}
                    back.
                </h2>
                <p className="mt-8 max-w-xl text-pretty text-lg leading-8 text-stone-400">
                    The product direction is careful by design: assistance for spotting patterns, organizing wallets, and recalling what needs attention, while you keep your hand on every financial decision.
                </p>
                <ul className="mt-10 grid gap-3 text-sm text-stone-300 sm:grid-cols-2">
                    {[
                        { label: "Insight", body: "Surface what changed." },
                        { label: "Organization", body: "Wallets, tags, hygiene." },
                        { label: "Recall", body: "Reminders before they bite." },
                        { label: "Restraint", body: "Never moves your money." },
                    ].map((entry) => (
                        <li
                            key={entry.label}
                            className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                        >
                            <span className="font-[family-name:var(--font-geist-mono)] text-[0.65rem] uppercase tracking-[0.22em] text-[#a3d7bf]">
                                {entry.label}
                            </span>
                            <span className="text-stone-200">{entry.body}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-2 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[calc(2rem-0.5rem)] bg-[#0a1014] p-5 sm:aspect-[16/11] md:p-7">
                    <div
                        aria-hidden="true"
                        className="sp-aurora absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(127,184,154,0.28),transparent_36%),radial-gradient(circle_at_8%_82%,rgba(212,197,156,0.16),transparent_30%)]"
                    />

                    <div className="sp-motion-card relative z-30 max-w-md overflow-hidden rounded-3xl border border-white/10 bg-black/55 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl">
                        <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#7fb89a] shadow-[0_0_8px_2px_rgba(127,184,154,0.5)]" />
                            <p className="font-[family-name:var(--font-geist-mono)] text-[0.65rem] uppercase tracking-[0.22em] text-[#a3d7bf]">
                                assistant note
                            </p>
                        </div>
                        <p className="mt-3 font-[family-name:var(--font-fraunces)] text-[1.2rem] font-medium leading-[1.25] tracking-[-0.005em] text-white">
                            Three travel-wallet cards are sitting near the same utilization threshold.
                        </p>
                        <p className="mt-3 text-sm leading-6 text-stone-400">
                            Review balances before the next statement cycle. SmartPockets tracks the context; you make the move.
                        </p>
                        <div className="mt-4 flex items-center gap-2 font-[family-name:var(--font-geist-mono)] text-[0.7rem] uppercase tracking-[0.18em] text-stone-500">
                            <span>15:42</span>
                            <span>&middot;</span>
                            <span className="text-stone-300">Mon &middot; Reviewed by you</span>
                        </div>
                    </div>

                    <div className="sp-motion-card absolute bottom-10 right-5 z-10 w-[58%] max-w-xs rotate-[5deg] sm:bottom-8 sm:right-8">
                        <CreditCard type="transparent-gradient" brand="visa" cardHolder="TRAVEL WALLET" />
                    </div>

                    <div className="sp-motion-card absolute bottom-5 left-5 z-20 w-[54%] max-w-64 rotate-[-7deg] sm:bottom-7 sm:left-8">
                        <CreditCard type="gray-dark" brand="mastercard" cardHolder="DAILY WALLET" />
                    </div>

                    <div className="sp-motion-card absolute right-6 top-8 z-10 hidden w-48 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl sm:block">
                        <p className="font-[family-name:var(--font-geist-mono)] text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-400">
                            card hygiene
                        </p>
                        <div className="mt-4 space-y-3">
                            <div className="h-2 rounded-full bg-gradient-to-r from-[#7fb89a] to-[#d4c59c]/70" />
                            <div className="h-2 w-4/5 rounded-full bg-white/20" />
                            <div className="h-2 w-2/3 rounded-full bg-white/15" />
                        </div>
                        <p className="mt-3 font-[family-name:var(--font-geist-mono)] text-[0.6rem] uppercase tracking-[0.16em] text-stone-500">
                            5 of 12 reviewed
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </SectionShell>
);

export default function HomePage() {
    const pageRef = useRef<HTMLDivElement>(null);
    const agentRef = useRef<HTMLElement>(null);
    const manifestoRef = useRef<HTMLElement>(null);

    const manifestoWords =
        "Personal finance has been quietly hostile to the people who actually run their own portfolios. SmartPockets is a workshop, not a coach — a calm place for your cards, transactions, and the assistance you choose to enable.".split(
            " ",
        );

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        const media = gsap.matchMedia();

        media.add("(prefers-reduced-motion: no-preference)", () => {
            const context = gsap.context(() => {
                gsap.fromTo(
                    ".sp-hero-in",
                    { y: 32, opacity: 0, filter: "blur(8px)" },
                    {
                        y: 0,
                        opacity: 1,
                        filter: "blur(0px)",
                        duration: 1.05,
                        stagger: 0.09,
                        ease: "power3.out",
                    },
                );

                gsap.fromTo(
                    ".sp-hero-mockup",
                    { y: 60, opacity: 0, scale: 0.95 },
                    {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        duration: 1.4,
                        ease: "expo.out",
                        delay: 0.3,
                    },
                );

                gsap.fromTo(
                    ".sp-horizon",
                    { scaleX: 0 },
                    {
                        scaleX: 1,
                        duration: 1.6,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: pageRef.current,
                            start: "top top",
                        },
                    },
                );

                gsap.fromTo(
                    ".sp-motion-card",
                    { y: 48, scale: 0.85, opacity: 0.4 },
                    {
                        y: 0,
                        scale: 1,
                        opacity: 1,
                        stagger: 0.14,
                        scrollTrigger: {
                            trigger: agentRef.current,
                            start: "top 78%",
                            end: "bottom 42%",
                            scrub: 0.8,
                        },
                    },
                );

                gsap.to(".sp-reveal-word", {
                    opacity: 1,
                    stagger: 0.05,
                    scrollTrigger: {
                        trigger: manifestoRef.current,
                        start: "top 76%",
                        end: "bottom 50%",
                        scrub: 0.6,
                    },
                });

                gsap.fromTo(
                    ".sp-bento-in",
                    { y: 40, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        stagger: 0.1,
                        duration: 0.9,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: ".sp-bento-grid",
                            start: "top 80%",
                        },
                    },
                );
            }, pageRef);

            return () => context.revert();
        });

        return () => media.revert();
    }, []);

    return (
        <div ref={pageRef} className="relative isolate overflow-hidden bg-[#080a0c]">
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 z-0 opacity-[0.05] [background-image:radial-gradient(rgba(255,255,255,0.85)_1px,transparent_1px)] [background-size:4px_4px]"
            />
            <div
                aria-hidden="true"
                className="sp-aurora pointer-events-none absolute inset-x-0 top-0 z-0 h-[44rem] bg-[radial-gradient(circle_at_22%_14%,rgba(127,184,154,0.28),transparent_36%),radial-gradient(circle_at_76%_8%,rgba(212,197,156,0.16),transparent_32%)]"
            />

            <section className="relative z-10 px-4 pb-24 pt-16 sm:px-6 md:pb-32 md:pt-24 lg:px-8">
                <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
                    <div>
                        <div className="sp-hero-in flex items-center gap-3 font-[family-name:var(--font-geist-mono)] text-[0.68rem] uppercase tracking-[0.28em] text-stone-400">
                            <span className="h-px w-8 bg-stone-500" />
                            <span>SmartPockets v0.1</span>
                            <span className="text-stone-600">/</span>
                            <span className="text-[#a3d7bf]">private alpha</span>
                        </div>
                        <h1 className="sp-hero-in mt-7 max-w-5xl text-balance font-[family-name:var(--font-inter)] text-[clamp(3.1rem,5.6vw,5.8rem)] font-medium leading-[0.92] tracking-[-0.04em] text-white">
                            Open-source finance that hands{" "}
                            <em className="inline-block translate-y-[0.03em] font-[family-name:var(--font-fraunces)] text-[1.28em] font-medium italic text-stone-300 [font-feature-settings:'ss01']">
                                you
                            </em>{" "}
                            the keys.
                        </h1>
                        <p className="sp-hero-in mt-7 max-w-2xl text-pretty text-[1.15rem] leading-8 text-stone-400">
                            SmartPockets is a careful workshop for the people who manage more than one card. Real balances, clean wallets, transaction visibility, and future agent-assist that never pretends to control your money.
                        </p>
                        <div className="sp-hero-in mt-9">
                            <MarketingEmailForm idPrefix="hero-waitlist" />
                        </div>
                        <div className="sp-hero-in mt-8 flex flex-wrap gap-x-6 gap-y-3 font-[family-name:var(--font-geist-mono)] text-[0.72rem] uppercase tracking-[0.18em] text-stone-400">
                            <a
                                className="outline-focus-ring inline-flex items-center gap-1.5 rounded-full hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
                                href="/sign-up"
                            >
                                <span className="h-1 w-1 rounded-full bg-[#7fb89a]" />
                                Join with Clerk
                            </a>
                            <a
                                className="outline-focus-ring inline-flex items-center gap-1.5 rounded-full hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
                                href="https://github.com/EricJamesCrow/smartpockets"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ArrowUpRight aria-hidden="true" className="size-3" />
                                Inspect the repo
                            </a>
                        </div>
                    </div>

                    <div className="sp-hero-mockup">
                        <ContainedWalletMockup />
                    </div>
                </div>
                <div className="mt-20 flex items-center gap-4">
                    <span className="sp-horizon h-px flex-1 origin-left bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    <span className="font-[family-name:var(--font-geist-mono)] text-[0.62rem] uppercase tracking-[0.32em] text-stone-500">
                        scroll for the position
                    </span>
                    <span className="sp-horizon h-px flex-1 origin-right bg-gradient-to-l from-transparent via-white/30 to-transparent" />
                </div>
            </section>

            <ProofMarquee />

            <section ref={manifestoRef}>
                <Manifesto words={manifestoWords} />
            </section>

            <SectionShell id="features">
                <SectionRule>II &middot; The capabilities</SectionRule>
                <div className="mb-12 grid gap-10 lg:grid-cols-[0.5fr_1fr] lg:items-end lg:gap-20 md:mb-16">
                    <div>
                        <Eyebrow>What it does</Eyebrow>
                        <p className="font-[family-name:var(--font-geist-mono)] text-[0.7rem] uppercase tracking-[0.22em] text-stone-500">
                            Card-first object model
                        </p>
                    </div>
                    <div className="max-w-3xl">
                        <h2 className="text-balance font-[family-name:var(--font-inter)] text-[clamp(2.4rem,4.4vw,4.8rem)] font-medium leading-[0.96] tracking-[-0.035em] text-white">
                            Built for people whose finances do not{" "}
                            <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-stone-300">fit</em>{" "}
                            a starter template.
                        </h2>
                        <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-stone-400">
                            The first job is not budgeting theatrics. It is giving card-heavy users a reliable place to see what is connected, what changed, and what needs attention.
                        </p>
                    </div>
                </div>

                <div className="sp-bento-grid grid grid-cols-1 gap-4 lg:grid-flow-dense lg:auto-rows-[10rem] lg:grid-cols-12 lg:grid-rows-3">
                    {bentoCards.map((card) => (
                        <GlassCard key={card.title} className={`sp-bento-in ${card.className}`}>
                            <BentoCard {...card} />
                        </GlassCard>
                    ))}
                </div>
            </SectionShell>

            <section ref={agentRef}>
                <AgenticSection />
            </section>

            <SectionShell id="newsletter" className="pb-28 md:pb-40">
                <SectionRule>IV &middot; The invitation</SectionRule>
                <div className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-2 shadow-[0_34px_120px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl">
                    <div className="relative overflow-hidden rounded-[calc(2.25rem-0.5rem)] bg-[#0a1014] px-6 py-12 sm:px-10 md:px-12 lg:px-16 lg:py-20">
                        <div
                            aria-hidden="true"
                            className="sp-aurora pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(127,184,154,0.26),transparent_36%),radial-gradient(circle_at_88%_8%,rgba(212,197,156,0.16),transparent_30%)]"
                        />
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(rgba(255,255,255,0.85)_1px,transparent_1px)] [background-size:3px_3px]"
                        />
                        <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_0.86fr] lg:items-end">
                            <div>
                                <Eyebrow>Early access</Eyebrow>
                                <h2 className="max-w-4xl text-balance font-[family-name:var(--font-inter)] text-[clamp(2.5rem,4.8vw,5.2rem)] font-medium leading-[0.94] tracking-[-0.035em] text-white">
                                    Help shape the finance app power users can{" "}
                                    <em className="font-[family-name:var(--font-fraunces)] sp-shimmer-text font-medium italic [font-feature-settings:'ss01']">trust.</em>
                                </h2>
                                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-stone-400">
                                    The alpha is focused on credit-card visibility first. The broader vision is open-source personal finance with careful assistance layered on top &mdash; on your terms.
                                </p>
                            </div>

                            <div className="rounded-[1.75rem] border border-white/10 bg-black/35 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl">
                                <MarketingEmailForm compact idPrefix="cta-waitlist" />
                                <div className="mt-6 flex flex-wrap gap-4 font-[family-name:var(--font-geist-mono)] text-[0.7rem] uppercase tracking-[0.18em] text-stone-400">
                                    <a
                                        className="outline-focus-ring rounded-full hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
                                        href="/privacy"
                                    >
                                        Privacy
                                    </a>
                                    <a
                                        className="outline-focus-ring rounded-full hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
                                        href="/terms"
                                    >
                                        Terms
                                    </a>
                                    <a
                                        className="outline-focus-ring rounded-full hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
                                        href="https://github.com/EricJamesCrow/smartpockets"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        GitHub
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </SectionShell>
        </div>
    );
}
