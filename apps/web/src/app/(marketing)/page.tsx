"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { gsap } from "gsap";

const primaryButtonClassName = "rounded-full bg-stone-100 text-[#0a1410] shadow-none ring-transparent hover:bg-white";
const secondaryButtonClassName = "rounded-full bg-transparent text-stone-300 shadow-none ring-white/15 hover:bg-white/[0.06] hover:text-white";

const walletRows = [
    { wallet: "Daily driver", network: "Visa ··4821", balance: "$1,240", due: "Due Jun 28" },
    { wallet: "Travel", network: "Amex ··3007", balance: "$3,480", due: "Due Jul 2" },
    { wallet: "Household", network: "Mastercard ··9156", balance: "$1,424", due: "Due Jul 9" },
];

const principles = [
    {
        title: "Reads, never moves",
        body: "SmartPockets observes balances and transactions through read-only Plaid access. It cannot initiate a payment or a transfer.",
    },
    {
        title: "Open to audit",
        body: "The entire codebase is public. You can verify what happens to your data instead of taking anyone's word for it.",
    },
    {
        title: "Not an ad business",
        body: "Your data is synced so you can see your own accounts. It isn't resold and it isn't used to target ads.",
    },
];

const capabilities = [
    {
        title: "Card-first model",
        body: "Balances, limits, due dates, and transactions stay attached to the card they belong to instead of dissolving into one combined feed.",
    },
    {
        title: "Wallets",
        body: "Group cards the way you actually use them: daily spend, travel, household, business. Each wallet rolls up its own totals.",
    },
    {
        title: "Utilization tracking",
        body: "Per-card and overall utilization stay current as balances sync, so a creeping balance shows up before the statement does.",
    },
    {
        title: "Due-date reminders",
        body: "Statement and payment dates for every card in one place, with reminders before they arrive.",
    },
];

const roadmapItems = [
    { label: "Insight", body: "Surfaces what changed across cards and wallets since you last looked." },
    { label: "Organization", body: "Keeps wallets, tags, and stale connections tidy." },
    { label: "Recall", body: "Reminds you ahead of due dates and statement closes." },
    { label: "Restraint", body: "Never initiates a payment or transfer. That boundary is permanent." },
];

const SectionShell = ({ id, label, children }: { id?: string; label: string; children: ReactNode }) => (
    <section id={id} className="scroll-mt-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl border-t border-white/[0.06] py-20 md:py-24">
            <p className="font-[family-name:var(--font-geist-mono)] text-[13px] text-[#7fb89a]">{label}</p>
            {children}
        </div>
    </section>
);

const SectionHeading = ({ children }: { children: ReactNode }) => (
    <h2 className="mt-4 max-w-2xl text-balance font-[family-name:var(--font-inter)] text-3xl font-medium leading-[1.15] tracking-[-0.02em] text-white sm:text-4xl">
        {children}
    </h2>
);

const HeroCtas = () => (
    <>
        <Button href="/sign-up" size="lg" className={primaryButtonClassName}>
            Request an invite
        </Button>
        <Button
            href="https://github.com/EricJamesCrow/smartpockets"
            target="_blank"
            rel="noopener noreferrer"
            color="secondary"
            size="lg"
            className={secondaryButtonClassName}
        >
            View on GitHub
        </Button>
    </>
);

const WalletSnapshot = () => (
    <div className="sp-hero-in rounded-2xl border border-white/[0.08] bg-[#0c0f12]">
        <div className="flex items-end justify-between gap-4 px-6 py-5">
            <div>
                <p className="text-[13px] text-stone-500">Total balance</p>
                <p className="mt-1.5 font-[family-name:var(--font-geist-mono)] text-3xl font-medium tabular-nums tracking-tight text-white">
                    $6,144
                </p>
            </div>
            <p className="pb-0.5 text-[13px] text-stone-500">3 cards · synced 2 min ago</p>
        </div>
        <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {walletRows.map((row) => (
                <div key={row.wallet} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div>
                        <p className="text-sm font-medium text-stone-200">{row.wallet}</p>
                        <p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-xs text-stone-500">{row.network}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-stone-200">{row.balance}</p>
                        <p className="mt-0.5 text-xs text-stone-500">{row.due}</p>
                    </div>
                </div>
            ))}
        </div>
        <div className="px-6 py-5">
            <div className="flex items-center justify-between text-[13px]">
                <span className="text-stone-500">Utilization</span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-stone-300">24% · $6,144 of $25,600</span>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full w-[24%] rounded-full bg-[#7fb89a]" />
            </div>
        </div>
    </div>
);

const AssistantNote = () => (
    <div className="h-fit rounded-2xl border border-white/[0.08] bg-[#0c0f12] p-6 md:p-7">
        <p className="font-[family-name:var(--font-geist-mono)] text-[13px] text-stone-500">Assistant note · sample</p>
        <p className="mt-4 text-lg font-medium leading-7 text-white">
            Three cards in your travel wallet are within 5% of the same utilization threshold.
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-400">
            Worth reviewing before statements close on the 28th. Nothing here happens unless you do it.
        </p>
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/[0.06] pt-4 text-[13px] text-stone-500">
            <span className="font-[family-name:var(--font-geist-mono)]">Mon 15:42</span>
            <span>Marked reviewed by you</span>
        </div>
    </div>
);

export default function HomePage() {
    const pageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const media = gsap.matchMedia();

        media.add("(prefers-reduced-motion: no-preference)", () => {
            const context = gsap.context(() => {
                gsap.fromTo(
                    ".sp-hero-in",
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: "power3.out" },
                );
            }, pageRef);

            return () => context.revert();
        });

        return () => media.revert();
    }, []);

    return (
        <div ref={pageRef} className="bg-[#080a0c]">
            <section className="px-4 pb-20 pt-16 sm:px-6 md:pb-24 md:pt-24 lg:px-8">
                <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
                    <div>
                        <h1 className="sp-hero-in text-balance font-[family-name:var(--font-inter)] text-[2.6rem] font-medium leading-[1.05] tracking-[-0.03em] text-white sm:text-6xl lg:text-[4rem]">
                            Open-source credit card management.
                        </h1>
                        <p className="sp-hero-in mt-6 max-w-xl text-pretty text-lg leading-7 text-stone-400">
                            SmartPockets tracks balances, utilization, and due dates across every card you carry. Sync runs through
                            Plaid. The code is public, and you can host it yourself.
                        </p>
                        <div className="sp-hero-in mt-9 flex flex-wrap items-center gap-3">
                            <HeroCtas />
                        </div>
                    </div>

                    <WalletSnapshot />
                </div>
            </section>

            <SectionShell id="manifesto" label="Principles">
                <SectionHeading>Built on three commitments.</SectionHeading>
                <p className="mt-4 max-w-xl text-base leading-7 text-stone-400">
                    They hold for everything on the roadmap, including the agent features.
                </p>
                <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
                    {principles.map((principle) => (
                        <div key={principle.title} className="border-t border-white/[0.08] pt-5">
                            <h3 className="text-base font-medium text-white">{principle.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-stone-400">{principle.body}</p>
                        </div>
                    ))}
                </div>
            </SectionShell>

            <SectionShell id="features" label="Capabilities">
                <SectionHeading>Built around the cards you actually carry.</SectionHeading>
                <p className="mt-4 max-w-2xl text-base leading-7 text-stone-400">
                    The first job is visibility: which cards are connected, what changed, and what needs attention before the next
                    statement.
                </p>

                <div className="mt-12 grid gap-8 rounded-2xl border border-white/[0.08] bg-[#0c0f12] p-7 md:p-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-12">
                    <div>
                        <h3 className="text-xl font-medium tracking-[-0.01em] text-white">Open source, top to bottom</h3>
                        <p className="mt-3 max-w-md text-base leading-7 text-stone-400">
                            Every line that touches your data is public. Use the hosted version, or clone the repo and run the whole
                            stack with your own keys.
                        </p>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#080a0c]">
                        <pre className="overflow-x-auto px-5 py-4 font-[family-name:var(--font-geist-mono)] text-[13px] leading-6 text-stone-300">
                            <span className="text-[#7fb89a]">$</span> git clone github.com/EricJamesCrow/smartpockets{"\n"}
                            <span className="text-[#7fb89a]">$</span> bun install && bun dev{"\n"}
                            <span className="text-stone-500"># the full stack, on your machine</span>
                        </pre>
                    </div>
                </div>

                <div className="mt-6 divide-y divide-white/[0.06] border-t border-white/[0.06]">
                    {capabilities.map((item) => (
                        <div key={item.title} className="grid gap-1.5 py-6 sm:grid-cols-[15rem_1fr] sm:gap-10">
                            <h3 className="text-base font-medium text-white">{item.title}</h3>
                            <p className="max-w-2xl text-base leading-7 text-stone-400">{item.body}</p>
                        </div>
                    ))}
                </div>
            </SectionShell>

            <SectionShell id="agentic" label="Roadmap">
                <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
                    <div>
                        <SectionHeading>Agent-assisted, never agent-acting.</SectionHeading>
                        <p className="mt-4 max-w-xl text-base leading-7 text-stone-400">
                            The next phase adds an assistant for the work you'd rather not do by hand. It can spot a utilization
                            change, tidy a wallet, or flag an approaching due date. It reads and suggests; nothing in the roadmap
                            gives it the power to move money.
                        </p>
                        <dl className="mt-10 border-t border-white/[0.06]">
                            {roadmapItems.map((item) => (
                                <div key={item.label} className="flex gap-6 border-b border-white/[0.06] py-4 sm:gap-10">
                                    <dt className="w-28 shrink-0 font-[family-name:var(--font-geist-mono)] text-[13px] leading-6 text-[#7fb89a]">
                                        {item.label}
                                    </dt>
                                    <dd className="text-sm leading-6 text-stone-400">{item.body}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>

                    <AssistantNote />
                </div>
            </SectionShell>

            <SectionShell label="Early access">
                <SectionHeading>SmartPockets is in private alpha.</SectionHeading>
                <p className="mt-4 max-w-xl text-base leading-7 text-stone-400">
                    Invites go out in small batches while the card-tracking core settles. If you manage more than a couple of
                    cards, request one and help shape what gets built.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                    <HeroCtas />
                </div>
            </SectionShell>
        </div>
    );
}
