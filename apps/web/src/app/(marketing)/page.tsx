"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { CreditCard } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";
import { ChartBreakoutSquare, CreditCard02, MessageChatCircle, Zap } from "@untitledui/icons";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const bentoCards = [
    {
        title: "Open source by default",
        description: "Use the hosted alpha, inspect the code, or self-host with your own keys when you want the whole stack under your control.",
        icon: MessageChatCircle,
        className: "lg:col-span-7 lg:row-span-2",
        visual: "repo",
    },
    {
        title: "Built around cards",
        description: "Balances, utilization, APRs, due dates, and transactions stay attached to the cards you actually use.",
        icon: CreditCard02,
        className: "lg:col-span-5 lg:row-span-1",
        visual: "cards",
    },
    {
        title: "Agent-assisted roadmap",
        description:
            "SmartPockets is moving toward assistance for insight, organization, reminders, and portfolio hygiene without pretending to move money for you.",
        icon: Zap,
        className: "lg:col-span-5 lg:row-span-2",
        visual: "agent",
    },
    {
        title: "Privacy-respecting architecture",
        description: "Plaid data flows into a product built for visibility and ownership, not ad targeting or opaque aggregation.",
        icon: ChartBreakoutSquare,
        className: "lg:col-span-7 lg:row-span-1",
        visual: "privacy",
    },
];

const marqueeItems = ["open source finance", "Plaid-powered sync", "Convex-native realtime", "self-hostable path", "agent-assisted roadmap"];

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
    <p className="mb-5 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-emerald-200">
        {children}
    </p>
);

const MarketingEmailForm = ({ compact = false, idPrefix }: { compact?: boolean; idPrefix: string }) => (
    <div className="w-full">
        <Form onSubmit={preventPrototypeSubmit} className={`flex w-full flex-col gap-3 ${compact ? "sm:flex-row" : "md:max-w-xl md:flex-row"}`}>
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
                placeholder="you@example.com…"
                wrapperClassName="min-h-12 rounded-full border border-white/10 bg-white/[0.08] px-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] focus-within:ring-2 focus-within:ring-emerald-300/50"
                inputClassName="text-white placeholder:text-gray-500"
            />
            <Button
                id={`${idPrefix}-submit`}
                type="submit"
                size="xl"
                className="min-h-12 rounded-full bg-white px-6 text-gray-950 ring-white/20 transition-[background-color,transform,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-emerald-100 active:scale-[0.98]"
            >
                Request access
            </Button>
        </Form>
        <p id={`${idPrefix}-hint`} className="mt-2 text-sm text-gray-500">
            Prototype waitlist form. Email capture is not active yet.
        </p>
    </div>
);

const GlassCard = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
    <div className={`group rounded-[2rem] border border-white/10 bg-white/[0.045] p-1.5 shadow-[0_24px_90px_rgba(0,0,0,0.28)] ${className}`}>
        <div className="relative flex h-full min-h-64 flex-col overflow-hidden rounded-[calc(2rem-0.375rem)] bg-[#0a0f12] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-1 md:p-8">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.12),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(148,163,184,0.12),transparent_30%)]"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.65)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.65)_1px,transparent_1px)] [background-size:36px_36px]"
            />
            <div className="relative z-10 flex h-full flex-col">{children}</div>
        </div>
    </div>
);

const ContainedWalletMockup = () => (
    <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.045] p-2 shadow-[0_40px_120px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.12)]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[calc(2.25rem-0.5rem)] bg-[#07100d] sm:aspect-[5/4] lg:aspect-[4/5]">
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(16,185,129,0.25),transparent_32%),radial-gradient(circle_at_80%_16%,rgba(148,163,184,0.18),transparent_30%),linear-gradient(145deg,rgba(255,255,255,0.08),transparent_42%)]"
            />

            <div className="absolute left-5 right-5 top-5 rounded-3xl border border-white/10 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:left-7 sm:right-7 sm:top-7">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">wallet health</p>
                        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-white">$18,420</p>
                    </div>
                    <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-sm font-semibold text-emerald-100">72.4%</div>
                </div>
            </div>

            <div className="absolute left-5 top-36 w-[72%] rotate-[-8deg] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:rotate-[-5deg] sm:left-9 sm:top-32">
                <CreditCard type="brand-dark" brand="visa" cardHolder="ERIC CROW" cardNumber="4821 3840 1288 9024" />
            </div>
            <div className="absolute right-[-6%] top-56 w-[70%] rotate-[9deg] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:rotate-[6deg] sm:right-4 sm:top-48">
                <CreditCard type="transparent-gradient" brand="amex" cardHolder="ERIC CROW" cardNumber="3791 024801 44712" />
            </div>
            <div className="absolute bottom-10 left-7 w-[66%] rotate-[-2deg] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:rotate-0 sm:bottom-8 sm:left-12">
                <CreditCard type="gray-dark" brand="mastercard" cardHolder="ERIC CROW" cardNumber="5498 9031 2740 1184" />
            </div>

            <div className="absolute bottom-5 right-5 w-44 rounded-3xl border border-white/10 bg-black/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">next reminder</p>
                <p className="mt-2 text-sm font-semibold text-white">Autopay status review</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-3/5 rounded-full bg-emerald-300" />
                </div>
            </div>
        </div>
    </div>
);

const BentoVisual = ({ type }: { type: string }) => {
    if (type === "repo") {
        return (
            <div className="mt-auto grid gap-3 pt-8 text-sm text-gray-300 sm:grid-cols-3">
                {["Forkable", "Auditable", "Self-host path"].map((item) => (
                    <div key={item} className="rounded-2xl bg-white/[0.06] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        {item}
                    </div>
                ))}
            </div>
        );
    }

    if (type === "cards") {
        return (
            <div className="mt-4 flex -space-x-8">
                <div className="w-32 rotate-[-7deg]">
                    <CreditCard type="brand-dark" brand="visa" cardHolder="EC" />
                </div>
                <div className="w-32 rotate-[6deg]">
                    <CreditCard type="transparent" brand="discover" cardHolder="EC" />
                </div>
            </div>
        );
    }

    if (type === "agent") {
        return (
            <div className="mt-auto space-y-3 pt-8">
                {["Flag unusual utilization changes", "Suggest wallet cleanup", "Remind before due dates"].map((item, index) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 text-sm text-gray-300">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-300/10 text-xs font-semibold tabular-nums text-emerald-200">
                            {index + 1}
                        </span>
                        {item}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="mt-auto grid grid-cols-3 gap-3 pt-8">
            {["no ads", "your keys", "clear sync"].map((item) => (
                <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-gray-400"
                >
                    {item}
                </div>
            ))}
        </div>
    );
};

const BentoCard = ({ title, description, icon: Icon, visual }: (typeof bentoCards)[number]) => (
    <>
        <div className="mb-8 flex size-11 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
            <Icon aria-hidden="true" className="size-5" />
        </div>
        <h3 className="max-w-xl text-2xl font-semibold tracking-tight text-white">{title}</h3>
        <p className="mt-3 max-w-2xl text-pretty text-base leading-7 text-gray-400">{description}</p>
        <BentoVisual type={visual} />
    </>
);

const ProofMarquee = () => (
    <div className="relative overflow-hidden border-y border-white/10 py-5">
        <div className="animate-marquee flex w-max gap-4 motion-reduce:animate-none">
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
                <span
                    key={`${item}-${index}`}
                    className="rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-sm font-medium uppercase tracking-[0.16em] text-gray-400"
                >
                    {item}
                </span>
            ))}
        </div>
    </div>
);

const AgenticSection = ({ words }: { words: string[] }) => (
    <SectionShell id="agentic" className="py-24 md:py-36">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
                <Eyebrow>Future direction</Eyebrow>
                <h2 className="max-w-3xl text-balance text-[clamp(2.5rem,4.5vw,4.9rem)] font-semibold leading-[0.98] tracking-tight text-white">
                    Built for the moment finance starts helping back.
                </h2>
                <p className="mt-8 max-w-xl text-pretty text-xl leading-8 text-gray-400">
                    {words.map((word, index) => (
                        <span key={`${word}-${index}`} className="sp-reveal-word inline-block opacity-45 motion-reduce:opacity-100">
                            {word}
                            {index < words.length - 1 ? "\u00a0" : ""}
                        </span>
                    ))}
                </p>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-2 shadow-[0_30px_100px_rgba(0,0,0,0.34)]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[calc(2rem-0.5rem)] bg-[#08100f] p-5 sm:aspect-[16/11] md:p-7">
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_10%_80%,rgba(148,163,184,0.16),transparent_30%)]"
                    />

                    <div className="sp-motion-card relative z-30 max-w-md rounded-3xl border border-white/10 bg-black/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">assistant note</p>
                        <p className="mt-3 text-lg font-semibold text-white">Your travel wallet has 3 cards near the same utilization threshold.</p>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            Review balances before the next statement cycle. SmartPockets tracks the context; you make the move.
                        </p>
                    </div>

                    <div className="sp-motion-card absolute bottom-10 right-5 z-10 w-[58%] max-w-xs rotate-[5deg] sm:bottom-8 sm:right-8">
                        <CreditCard type="transparent-gradient" brand="visa" cardHolder="TRAVEL WALLET" />
                    </div>

                    <div className="sp-motion-card absolute bottom-5 left-5 z-20 w-[54%] max-w-64 rotate-[-7deg] sm:bottom-7 sm:left-8">
                        <CreditCard type="gray-dark" brand="mastercard" cardHolder="DAILY WALLET" />
                    </div>

                    <div className="sp-motion-card absolute right-6 top-8 z-10 hidden w-48 rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:block">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">card hygiene</p>
                        <div className="mt-4 space-y-3">
                            <div className="h-2 rounded-full bg-emerald-300/70" />
                            <div className="h-2 w-4/5 rounded-full bg-white/20" />
                            <div className="h-2 w-2/3 rounded-full bg-white/15" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </SectionShell>
);

export default function HomePage() {
    const pageRef = useRef<HTMLDivElement>(null);
    const agentRef = useRef<HTMLElement>(null);
    const revealWords =
        "The product direction is careful by design: assistance for spotting patterns, organizing wallets, and reminding you what needs attention, while you stay in control of every financial decision.".split(
            " ",
        );

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        const media = gsap.matchMedia();

        media.add("(prefers-reduced-motion: no-preference)", () => {
            const context = gsap.context(() => {
                gsap.fromTo(".sp-hero-in", { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: "power3.out" });

                gsap.fromTo(
                    ".sp-motion-card",
                    { y: 36, scale: 0.88, opacity: 0.45 },
                    {
                        y: 0,
                        scale: 1,
                        opacity: 1,
                        stagger: 0.12,
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
                    stagger: 0.04,
                    scrollTrigger: {
                        trigger: agentRef.current,
                        start: "top 78%",
                        end: "center center",
                        scrub: true,
                    },
                });
            }, pageRef);

            return () => context.revert();
        });

        return () => media.revert();
    }, []);

    return (
        <div ref={pageRef} className="relative isolate overflow-hidden bg-[#05070a]">
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 z-0 opacity-[0.05] [background-image:radial-gradient(rgba(255,255,255,0.85)_1px,transparent_1px)] [background-size:4px_4px]"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[42rem] bg-[radial-gradient(circle_at_22%_14%,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_76%_8%,rgba(148,163,184,0.16),transparent_30%)]"
            />

            <section className="relative z-10 px-4 pb-24 pt-20 sm:px-6 md:pb-32 md:pt-28 lg:px-8">
                <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
                    <div>
                        <Eyebrow>Open-source money OS</Eyebrow>
                        <h1 className="sp-hero-in max-w-5xl text-balance text-[clamp(3rem,4.8vw,5.1rem)] font-semibold leading-[0.94] tracking-tight text-white">
                            Open-source finance with{" "}
                            <span className="inline-flex h-10 w-24 translate-y-1 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 align-middle shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] sm:h-12 sm:w-32">
                                <span className="h-2 w-14 rounded-full bg-emerald-200/80 sm:w-20" />
                            </span>{" "}
                            agent assist.
                        </h1>
                        <p className="sp-hero-in mt-7 max-w-2xl text-pretty text-xl leading-8 text-gray-400">
                            SmartPockets is the open-source alternative to subscription finance apps, starting with the credit-card workflows power users
                            actually need: real balances, clean wallets, transaction visibility, and future assistance that never pretends to control your
                            money.
                        </p>
                        <div className="sp-hero-in mt-9">
                            <MarketingEmailForm idPrefix="hero-waitlist" />
                        </div>
                        <div className="sp-hero-in mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-gray-400">
                            <a
                                className="outline-focus-ring rounded-full hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
                                href="/sign-up"
                            >
                                Join with Clerk
                            </a>
                            <a
                                className="outline-focus-ring rounded-full hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
                                href="https://github.com/EricJamesCrow/smartpockets"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Inspect the repo
                            </a>
                        </div>
                    </div>

                    <div className="sp-hero-in">
                        <ContainedWalletMockup />
                    </div>
                </div>
            </section>

            <ProofMarquee />

            <SectionShell id="features">
                <div className="mb-12 max-w-3xl md:mb-16">
                    <Eyebrow>Why it exists</Eyebrow>
                    <h2 className="text-balance text-[clamp(2.4rem,4.4vw,4.8rem)] font-semibold leading-[0.98] tracking-tight text-white">
                        Built for people whose finances do not fit in a starter template.
                    </h2>
                    <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-gray-400">
                        The first job is not budgeting theatrics. It is giving card-heavy users a reliable place to see what is connected, what changed, and
                        what needs attention.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-flow-dense lg:auto-rows-[10rem] lg:grid-cols-12 lg:grid-rows-3">
                    {bentoCards.map((card) => (
                        <GlassCard key={card.title} className={card.className}>
                            <BentoCard {...card} />
                        </GlassCard>
                    ))}
                </div>
            </SectionShell>

            <section ref={agentRef}>
                <AgenticSection words={revealWords} />
            </section>

            <SectionShell id="newsletter" className="pb-28 md:pb-40">
                <div className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.05] p-2 shadow-[0_34px_120px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.12)]">
                    <div className="relative overflow-hidden rounded-[calc(2.25rem-0.5rem)] bg-[#07100d] px-6 py-12 sm:px-10 md:px-12 lg:px-16 lg:py-16">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(255,255,255,0.12),transparent_28%)]"
                        />
                        <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_0.86fr] lg:items-end">
                            <div>
                                <Eyebrow>Early access</Eyebrow>
                                <h2 className="max-w-4xl text-balance text-[clamp(2.5rem,4.6vw,5rem)] font-semibold leading-[0.96] tracking-tight text-white">
                                    Help shape the finance app that power users can actually trust.
                                </h2>
                                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-gray-400">
                                    The alpha is focused on credit-card visibility first. The broader vision is open-source personal finance with careful
                                    assistance layered on top.
                                </p>
                            </div>

                            <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                                <MarketingEmailForm compact idPrefix="cta-waitlist" />
                                <div className="mt-5 flex flex-wrap gap-4 text-sm text-gray-400">
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
