"use client";

import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { CreditCard } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";
import { ArrowRight, Lock01, Stars02, ZapFast } from "@untitledui/icons";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Grain } from "@/components/marketing/grain";
import { Reveal } from "@/components/marketing/reveal";
import { cx } from "@repo/ui/utils";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

// ────────────────────────────────────────────────────────────────────────────
//  HERO
// ────────────────────────────────────────────────────────────────────────────

const HeroVault = () => {
    const stackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const stack = stackRef.current;
        if (!stack) return;

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) return;

        const cards = stack.querySelectorAll<HTMLElement>("[data-vault-card]");
        const ctx = gsap.context(() => {
            gsap.fromTo(
                cards,
                { yPercent: 18, autoAlpha: 0, rotateZ: (i) => -8 + i * 2, filter: "blur(14px)" },
                {
                    yPercent: 0,
                    autoAlpha: 1,
                    rotateZ: 0,
                    filter: "blur(0px)",
                    duration: 1.4,
                    ease: "power4.out",
                    stagger: 0.08,
                    delay: 0.2,
                },
            );

            // Subtle scroll-driven parallax on the stack itself.
            gsap.to(cards, {
                yPercent: -8,
                ease: "none",
                stagger: 0.04,
                scrollTrigger: {
                    trigger: stack,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.6,
                },
            });
        }, stack);

        return () => ctx.revert();
    }, []);

    return (
        <section className="relative isolate overflow-hidden">
            {/* Ambient field lighting — moss bloom + champagne fleck + edge vignette */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
                <div className="absolute -top-40 left-[-10%] h-[640px] w-[820px] rounded-full bg-[#7fb89a]/[0.11] blur-[140px]" />
                <div className="absolute right-[-8%] top-[20%] h-[520px] w-[520px] rounded-full bg-[#d4c59c]/[0.06] blur-[120px]" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#7fb89a]/[0.18] to-transparent" />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 pt-10 pb-20 md:px-8 md:pt-16 md:pb-28 lg:pt-24 lg:pb-32">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-8">
                    {/* Copy column */}
                    <div className="lg:col-span-7">
                        <Reveal stagger="[data-stagger]" className="flex flex-col items-start">
                            <Link
                                href="/sign-up"
                                data-stagger
                                className="inline-flex items-center gap-2 rounded-full border border-[#7fb89a]/[0.18] bg-[#7fb89a]/[0.04] px-3 py-1.5 outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                <span className="grid size-1.5 place-items-center">
                                    <span className="size-1.5 rounded-full bg-[#7fb89a] shadow-[0_0_8px_2px_rgba(127,184,154,0.5)]" />
                                </span>
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] tracking-[0.16em] text-[#a3d7bf]/85 uppercase">
                                    Alpha · Cohort 04
                                </span>
                                <span className="font-[family-name:var(--font-geist)] text-[12px] font-medium text-stone-50/90">
                                    Request access
                                </span>
                                <ArrowRight aria-hidden="true" className="size-3.5 text-stone-50/55" />
                            </Link>

                            <h1
                                data-stagger
                                className="font-[family-name:var(--font-geist)] mt-7 max-w-[16ch] text-[40px] leading-[1.02] font-medium tracking-[-0.025em] text-stone-50 sm:text-[52px] md:text-[64px] lg:text-[72px]"
                                style={{ textWrap: "balance" }}
                            >
                                Personal finance,
                                <br className="hidden md:inline" />{" "}
                                <span className="font-[family-name:var(--font-source-serif)] italic font-light text-[#d4c59c]/95">
                                    instrument-grade.
                                </span>
                            </h1>

                            <p
                                data-stagger
                                className="font-[family-name:var(--font-geist)] mt-6 max-w-[52ch] text-[16px] leading-[1.55] text-stone-50/55 md:mt-7 md:text-[18px]"
                                style={{ textWrap: "pretty" }}
                            >
                                A self-hostable workbench for cards, balances, and net worth. Plaid-native ingest, Convex-backed reactivity, and an
                                agent layer that keeps quiet until something actually warrants your attention.
                            </p>

                            <Form
                                data-stagger
                                onSubmit={(e: FormEvent<HTMLFormElement>) => {
                                    e.preventDefault();
                                    e.currentTarget.reset();
                                }}
                                className="mt-9 flex w-full max-w-[480px] flex-col items-stretch gap-3 sm:flex-row sm:items-start md:mt-10"
                            >
                                <Input
                                    isRequired
                                    size="md"
                                    name="email"
                                    type="email"
                                    placeholder="you@workbench.dev"
                                    wrapperClassName="py-0.5 flex-1"
                                    hint={
                                        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] tracking-wide text-stone-50/35">
                                            We won't sell, train on, or aggregate it. Read the{" "}
                                            <Link
                                                href="/privacy"
                                                className="rounded-xs underline-offset-2 outline-focus-ring underline focus-visible:outline-2 focus-visible:outline-offset-2"
                                            >
                                                privacy charter
                                            </Link>
                                            .
                                        </span>
                                    }
                                />
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="!bg-gradient-to-b !from-stone-50 !to-stone-200 !text-[#0a1410] !ring-white/30 hover:!from-white hover:!to-stone-100 shadow-[0_8px_24px_rgba(127,184,154,0.18),inset_0_1px_0_rgba(255,255,255,0.6)]"
                                >
                                    Reserve a seat
                                </Button>
                            </Form>

                            <ul data-stagger className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
                                {[
                                    { label: "MIT licensed", icon: Lock01 },
                                    { label: "No telemetry", icon: ZapFast },
                                    { label: "Self-host ready", icon: Stars02 },
                                ].map(({ label, icon: Icon }) => (
                                    <li
                                        key={label}
                                        className="font-[family-name:var(--font-jetbrains-mono)] flex items-center gap-2 text-[11px] tracking-[0.14em] text-stone-50/45 uppercase"
                                    >
                                        <Icon aria-hidden="true" className="size-3.5 text-[#7fb89a]/55" />
                                        {label}
                                    </li>
                                ))}
                            </ul>
                        </Reveal>
                    </div>

                    {/* Vault visual */}
                    <div className="relative lg:col-span-5">
                        <div
                            ref={stackRef}
                            className="relative mx-auto h-[460px] w-full max-w-[440px] overflow-hidden rounded-3xl border border-[#7fb89a]/[0.10] bg-gradient-to-br from-[#7fb89a]/[0.05] via-white/[0.015] to-transparent backdrop-blur-md sm:h-[520px] lg:h-[560px]"
                        >
                            {/* Inner edge highlight (glass refraction) */}
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-[#a3d7bf]/[0.06]"
                            />
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#d4c59c]/30 to-transparent"
                            />

                            {/* Status chip */}
                            <div className="absolute left-5 top-5 z-20 flex items-center gap-2 rounded-md border border-[#7fb89a]/[0.18] bg-[#080a0c]/60 px-2.5 py-1.5 backdrop-blur">
                                <span className="size-1.5 rounded-full bg-[#7fb89a] shadow-[0_0_8px_2px_rgba(127,184,154,0.5)]" />
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.18em] text-[#a3d7bf]/85 uppercase">
                                    Vault · 12 cards
                                </span>
                            </div>

                            {/* Telemetry chip (top-right) */}
                            <div className="absolute right-5 top-5 z-20 hidden items-center gap-3 rounded-md border border-[#d4c59c]/[0.16] bg-[#080a0c]/60 px-2.5 py-1.5 backdrop-blur sm:flex">
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.18em] text-[#d4c59c]/70 uppercase">
                                    Util
                                </span>
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[12px] font-medium tabular-nums text-stone-50">
                                    18.4%
                                </span>
                            </div>

                            {/* Card stack */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative h-[340px] w-[290px] sm:h-[380px] sm:w-[320px]">
                                    {[
                                        { type: "brand-dark", offset: -64, rotate: -10 },
                                        { type: "gray-dark", offset: -32, rotate: -5 },
                                        { type: "transparent-gradient", offset: 0, rotate: 0 },
                                        { type: "gradient-strip-vertical", offset: 32, rotate: 5 },
                                        { type: "salmon-strip", offset: 64, rotate: 10 },
                                    ].map((card, i) => (
                                        <div
                                            key={card.type + i}
                                            data-vault-card
                                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 ease-out"
                                            style={{
                                                transform: `translate(calc(-50% + ${card.offset}px), -50%) rotate(${card.rotate}deg)`,
                                                zIndex: 10 + i,
                                            }}
                                        >
                                            <div className="drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]">
                                                <CreditCard
                                                    type={card.type as Parameters<typeof CreditCard>[0]["type"]}
                                                    cardHolder="Eric Crow"
                                                    width={260}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bottom data ledger */}
                            <div className="absolute inset-x-5 bottom-5 z-20 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-[#7fb89a]/[0.10] bg-[#7fb89a]/[0.04] backdrop-blur">
                                {[
                                    { label: "Net liq.", value: "$48,217.08" },
                                    { label: "APR avg", value: "21.7%" },
                                    { label: "Next due", value: "May 03" },
                                ].map((item) => (
                                    <div key={item.label} className="bg-[#080a0c]/70 px-3 py-3">
                                        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] tracking-[0.18em] text-[#a3d7bf]/55 uppercase">
                                            {item.label}
                                        </p>
                                        <p className="font-[family-name:var(--font-jetbrains-mono)] mt-1 text-[12px] font-medium tabular-nums text-stone-50">
                                            {item.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ────────────────────────────────────────────────────────────────────────────
//  TICKER (subtle marquee of metrics)
// ────────────────────────────────────────────────────────────────────────────

const InstrumentTicker = () => {
    const items = [
        ["Cards tracked", "47,128"],
        ["Plaid items active", "1,204"],
        ["Webhooks p95", "82ms"],
        ["Sync uptime", "99.94%"],
        ["Categories", "318"],
        ["Avg utilization", "23.6%"],
        ["Open issues", "47"],
        ["Cohort 04 seats", "7 / 25"],
    ];
    const doubled = [...items, ...items];

    return (
        <section className="relative border-y border-[#7fb89a]/[0.08] bg-[#0a1014] py-7" aria-label="Live metrics">
            <div className="overflow-hidden">
                <div className="flex w-max animate-[marquee_55s_linear_infinite] gap-12">
                    {doubled.map(([label, value], i) => (
                        <div key={i} className="flex shrink-0 items-baseline gap-3 px-2">
                            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.22em] text-[#a3d7bf]/45 uppercase">
                                {label}
                            </span>
                            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[16px] font-medium tabular-nums text-stone-50/85">
                                {value}
                            </span>
                            <span className="text-[#d4c59c]/30">·</span>
                        </div>
                    ))}
                </div>
            </div>
            <style jsx>{`
                @keyframes marquee {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
            `}</style>
        </section>
    );
};

// ────────────────────────────────────────────────────────────────────────────
//  PRODUCT — instrument-panel feature trio
// ────────────────────────────────────────────────────────────────────────────

const sectionLabel = (kicker: string, value: string) => (
    <div className="flex items-center gap-3">
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] tracking-[0.22em] text-[#a3d7bf] uppercase">{kicker}</span>
        <span className="h-px w-12 bg-gradient-to-r from-[#7fb89a]/40 via-[#d4c59c]/25 to-transparent" />
        <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] tracking-[0.22em] text-[#d4c59c]/55 uppercase">{value}</span>
    </div>
);

const TiltCard = ({ children, className }: { children: ReactNode; className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) return;

        const onMove = (e: MouseEvent) => {
            const rect = node.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            node.style.setProperty("--mx", `${(x * 50).toFixed(1)}%`);
            node.style.setProperty("--my", `${(y * 50).toFixed(1)}%`);
            node.style.setProperty("--rx", `${(-y * 4).toFixed(2)}deg`);
            node.style.setProperty("--ry", `${(x * 4).toFixed(2)}deg`);
        };
        const onLeave = () => {
            node.style.setProperty("--mx", "50%");
            node.style.setProperty("--my", "50%");
            node.style.setProperty("--rx", "0deg");
            node.style.setProperty("--ry", "0deg");
        };

        node.addEventListener("mousemove", onMove);
        node.addEventListener("mouseleave", onLeave);
        return () => {
            node.removeEventListener("mousemove", onMove);
            node.removeEventListener("mouseleave", onLeave);
        };
    }, []);

    return (
        <div
            ref={ref}
            className={cx(
                "group relative overflow-hidden rounded-2xl border border-[#7fb89a]/[0.10] bg-gradient-to-b from-[#7fb89a]/[0.04] to-[#d4c59c]/[0.01] p-px transition-transform duration-300 ease-out",
                "[transform:perspective(1100px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]",
                className,
            )}
        >
            {/* Spotlight border — moss core, champagne tail */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                    background:
                        "radial-gradient(360px circle at var(--mx,50%) var(--my,50%), rgba(127,184,154,0.22), rgba(212,197,156,0.06) 38%, transparent 62%)",
                }}
            />
            <div className="relative h-full rounded-2xl bg-[#0c1014]">{children}</div>
        </div>
    );
};

const ProductInstruments = () => {
    return (
        <section id="product" className="relative py-24 md:py-32">
            <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
                <Reveal stagger="[data-stagger]" className="flex max-w-3xl flex-col items-start">
                    <div data-stagger>{sectionLabel("01", "What it does")}</div>
                    <h2
                        data-stagger
                        className="font-[family-name:var(--font-geist)] mt-6 text-[34px] leading-[1.05] font-medium tracking-[-0.02em] text-stone-50 md:text-[48px]"
                        style={{ textWrap: "balance" }}
                    >
                        Three instruments,{" "}
                        <span className="font-[family-name:var(--font-geist)] font-light text-[#a3d7bf]/90">one bench</span>.
                    </h2>
                    <p
                        data-stagger
                        className="mt-5 max-w-[58ch] font-[family-name:var(--font-geist)] text-[16px] leading-[1.55] text-stone-50/55"
                        style={{ textWrap: "pretty" }}
                    >
                        Cards, accounts, and pockets each have their own panel. They share state in real time and stay quiet unless something
                        relevant changes.
                    </p>
                </Reveal>

                <Reveal
                    stagger="[data-card]"
                    className="mt-14 grid grid-cols-1 gap-6 md:mt-20 md:grid-cols-12 md:gap-5"
                >
                    {/* Big — Vault */}
                    <TiltCard className="md:col-span-7" >
                        <div data-card className="flex h-full flex-col gap-8 p-7 md:p-9">
                            <div className="flex items-center justify-between">
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.22em] text-[#a3d7bf]/55 uppercase">
                                    /vault
                                </span>
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tabular-nums text-[#a3d7bf]">
                                    sync · 12s
                                </span>
                            </div>

                            <div>
                                <h3 className="font-[family-name:var(--font-geist)] text-[22px] leading-[1.15] font-medium tracking-[-0.015em] text-stone-50 md:text-[26px]">
                                    A vault of cards, organised the way you actually use them.
                                </h3>
                                <p className="mt-3 max-w-[44ch] font-[family-name:var(--font-geist)] text-[14px] leading-[1.55] text-stone-50/55">
                                    Group cards into custom pockets — daily drivers, travel hold, business — pin favourites, drag to reorder.
                                    Utilization, APR, and statement cycles travel with each card.
                                </p>
                            </div>

                            {/* Mock card row */}
                            <div className="relative overflow-hidden rounded-xl border border-[#7fb89a]/[0.10] bg-[#080a0c]/50 p-4">
                                <div className="flex gap-3 overflow-hidden">
                                    {(["brand-dark", "gradient-strip-vertical", "gray-dark"] as const).map((type, i) => (
                                        <div
                                            key={type}
                                            className="shrink-0 transition-transform duration-500 ease-out group-hover:translate-x-2"
                                            style={{ transform: `translateY(${i * 4}px)` }}
                                        >
                                            <CreditCard type={type} cardHolder="Eric Crow" width={148} />
                                        </div>
                                    ))}
                                </div>
                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0c1014] to-transparent"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md bg-[#7fb89a]/[0.08]">
                                {[
                                    { label: "Cards", value: "12" },
                                    { label: "Pockets", value: "4" },
                                    { label: "Avg util", value: "18.4%" },
                                ].map((stat) => (
                                    <div key={stat.label} className="bg-[#0c1014] px-4 py-3">
                                        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.18em] text-[#a3d7bf]/55 uppercase">
                                            {stat.label}
                                        </p>
                                        <p className="font-[family-name:var(--font-jetbrains-mono)] mt-1 text-[15px] font-medium tabular-nums text-stone-50">
                                            {stat.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TiltCard>

                    {/* Plaid panel */}
                    <TiltCard className="md:col-span-5">
                        <div data-card className="flex h-full flex-col gap-6 p-7 md:p-9">
                            <div className="flex items-center justify-between">
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.22em] text-[#a3d7bf]/55 uppercase">
                                    /sync
                                </span>
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tabular-nums text-[#d4c59c]/55">
                                    plaid · webhooks
                                </span>
                            </div>

                            <div>
                                <h3 className="font-[family-name:var(--font-geist)] text-[22px] leading-[1.15] font-medium tracking-[-0.015em] text-stone-50">
                                    Plaid-native ingest, rendered in real time.
                                </h3>
                                <p className="mt-3 font-[family-name:var(--font-geist)] text-[14px] leading-[1.55] text-stone-50/55">
                                    Convex pushes balance, statement, and transaction deltas the moment Plaid emits them. No polling. No silent
                                    staleness.
                                </p>
                            </div>

                            {/* Mock event log */}
                            <div className="rounded-xl border border-[#7fb89a]/[0.10] bg-[#080a0c]/50 p-4">
                                <ul className="font-[family-name:var(--font-jetbrains-mono)] flex flex-col gap-2 text-[11px] leading-[1.5] text-stone-50/55">
                                    {[
                                        ["12:04:22", "TRANSACTIONS_REMOVED", "ok"],
                                        ["12:04:18", "DEFAULT_UPDATE", "ok"],
                                        ["12:03:51", "HISTORICAL_PULL", "ok"],
                                        ["12:01:09", "HOLDINGS_UPDATE", "ok"],
                                    ].map(([t, name, status]) => (
                                        <li key={t} className="flex items-center justify-between gap-2">
                                            <span className="text-[#d4c59c]/55">{t}</span>
                                            <span className="flex-1 truncate text-stone-50/75">{name}</span>
                                            <span className="text-[#a3d7bf]">{status}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mt-auto flex items-baseline justify-between border-t border-[#7fb89a]/[0.10] pt-4">
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] tracking-[0.18em] text-[#a3d7bf]/55 uppercase">
                                    p95 webhook ack
                                </span>
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[20px] font-medium tabular-nums text-stone-50">
                                    82<span className="text-[12px] text-[#d4c59c]/55">ms</span>
                                </span>
                            </div>
                        </div>
                    </TiltCard>

                    {/* Agent */}
                    <TiltCard className="md:col-span-5">
                        <div data-card className="flex h-full flex-col gap-6 p-7 md:p-9">
                            <div className="flex items-center justify-between">
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.22em] text-[#a3d7bf]/55 uppercase">
                                    /agent
                                </span>
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tabular-nums text-[#d4c59c]/55">
                                    on call
                                </span>
                            </div>

                            <div>
                                <h3 className="font-[family-name:var(--font-geist)] text-[22px] leading-[1.15] font-medium tracking-[-0.015em] text-stone-50">
                                    An agent that earns its keep, then disappears.
                                </h3>
                                <p className="mt-3 font-[family-name:var(--font-geist)] text-[14px] leading-[1.55] text-stone-50/55">
                                    Categorisation, anomaly flags, payment nudges — surfaced once, then folded back into the silence. No daily
                                    notification spam, no debt-shame copy.
                                </p>
                            </div>

                            <div className="rounded-xl border border-[#7fb89a]/[0.10] bg-[#080a0c]/50 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="grid size-7 shrink-0 place-items-center rounded-md border border-[#7fb89a]/30 bg-[#7fb89a]/[0.10] text-[#a3d7bf]">
                                        <Stars02 className="size-3.5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.18em] text-[#a3d7bf] uppercase">
                                            Anomaly · 03:14 EST
                                        </p>
                                        <p className="mt-1.5 font-[family-name:var(--font-geist)] text-[13px] leading-[1.5] text-stone-50/85">
                                            Sapphire Reserve charged{" "}
                                            <span className="font-[family-name:var(--font-jetbrains-mono)] tabular-nums text-[#d4c59c]">
                                                $214.00
                                            </span>{" "}
                                            at a merchant you've never used. Lock card?
                                        </p>
                                        <div className="mt-3 flex gap-2">
                                            <button
                                                type="button"
                                                className="font-[family-name:var(--font-geist)] rounded-md border border-[#7fb89a]/[0.20] bg-[#7fb89a]/[0.06] px-2.5 py-1 text-[12px] font-medium text-stone-50/90 outline-focus-ring transition-colors duration-150 hover:bg-[#7fb89a]/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2"
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                type="button"
                                                className="font-[family-name:var(--font-geist)] rounded-md px-2.5 py-1 text-[12px] font-medium text-stone-50/45 outline-focus-ring transition-colors duration-150 hover:text-stone-50/75 focus-visible:outline-2 focus-visible:outline-offset-2"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TiltCard>

                    {/* Privacy */}
                    <TiltCard className="md:col-span-7">
                        <div data-card className="flex h-full flex-col gap-6 p-7 md:p-9">
                            <div className="flex items-center justify-between">
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.22em] text-[#a3d7bf]/55 uppercase">
                                    /charter
                                </span>
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tabular-nums text-[#d4c59c]/55">
                                    you-own-this
                                </span>
                            </div>

                            <div>
                                <h3 className="font-[family-name:var(--font-geist)] text-[22px] leading-[1.15] font-medium tracking-[-0.015em] text-stone-50 md:text-[26px]">
                                    Your ledger, your machine, your call.
                                </h3>
                                <p className="mt-3 max-w-[52ch] font-[family-name:var(--font-geist)] text-[14px] leading-[1.55] text-stone-50/55">
                                    Run hosted, or pull the source down and run it on your own Plaid keys. Either way, the data never gets sold,
                                    aggregated, or trained on. That's table stakes.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-[#7fb89a]/[0.08] sm:grid-cols-3">
                                {[
                                    { k: "License", v: "MIT" },
                                    { k: "Data exit", v: "JSON · CSV" },
                                    { k: "Auth", v: "Clerk · self-host" },
                                    { k: "Storage", v: "Convex" },
                                    { k: "Aggregator", v: "Plaid only" },
                                    { k: "Telemetry", v: "Off by default" },
                                ].map((row) => (
                                    <div key={row.k} className="bg-[#0c1014] px-4 py-3">
                                        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.18em] text-[#a3d7bf]/55 uppercase">
                                            {row.k}
                                        </p>
                                        <p className="font-[family-name:var(--font-jetbrains-mono)] mt-1 text-[13px] font-medium text-stone-50">
                                            {row.v}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TiltCard>
                </Reveal>
            </div>
        </section>
    );
};

// ────────────────────────────────────────────────────────────────────────────
//  STACK — code listing block
// ────────────────────────────────────────────────────────────────────────────

const StackPanel = () => {
    return (
        <section id="stack" className="relative border-y border-[#7fb89a]/[0.10] bg-[#0a1014] py-24 md:py-32">
            <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-12">
                    <Reveal stagger="[data-stagger]" className="lg:col-span-5">
                        <div data-stagger>{sectionLabel("02", "Architecture")}</div>
                        <h2
                            data-stagger
                            className="mt-6 font-[family-name:var(--font-geist)] text-[34px] leading-[1.05] font-medium tracking-[-0.02em] text-stone-50 md:text-[44px]"
                            style={{ textWrap: "balance" }}
                        >
                            Convex-native.{" "}
                            <span className="font-[family-name:var(--font-geist)] font-light text-[#a3d7bf]/85">No API soup.</span>
                        </h2>
                        <p
                            data-stagger
                            className="mt-5 max-w-[44ch] font-[family-name:var(--font-geist)] text-[16px] leading-[1.55] text-stone-50/55"
                            style={{ textWrap: "pretty" }}
                        >
                            Queries, mutations, and Plaid webhook handlers all live in the same TypeScript runtime. Reactivity is automatic.
                            Indexes are first-class. The Next.js layer is a view, not a bus.
                        </p>

                        <dl data-stagger className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6">
                            {[
                                ["Frontend", "Next.js 16 · App Router"],
                                ["Backend", "Convex · TypeScript"],
                                ["Auth", "Clerk · org-aware"],
                                ["Aggregator", "Plaid · webhooks"],
                                ["UI kit", "UntitledUI · Tailwind v4"],
                                ["Hosting", "Vercel / self"],
                            ].map(([k, v]) => (
                                <div key={k}>
                                    <dt className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.22em] text-[#a3d7bf]/55 uppercase">
                                        {k}
                                    </dt>
                                    <dd className="mt-1.5 font-[family-name:var(--font-geist)] text-[14px] font-medium text-stone-50/85">
                                        {v}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </Reveal>

                    <Reveal className="lg:col-span-7">
                        <div className="overflow-hidden rounded-2xl border border-[#7fb89a]/[0.12] bg-[#0c1014] shadow-[0_30px_80px_rgba(8,10,12,0.55),inset_0_1px_0_rgba(212,197,156,0.04)]">
                            <div className="flex items-center justify-between border-b border-[#7fb89a]/[0.10] px-5 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-[#7fb89a]/35" />
                                    <span className="size-2 rounded-full bg-[#d4c59c]/30" />
                                    <span className="size-2 rounded-full bg-stone-50/15" />
                                    <span className="font-[family-name:var(--font-jetbrains-mono)] ml-3 text-[11px] tracking-wider text-[#a3d7bf]/70">
                                        convex/cards.ts
                                    </span>
                                </div>
                                <span className="font-[family-name:var(--font-jetbrains-mono)] inline-flex items-center gap-1.5 text-[10px] tracking-[0.16em] text-[#a3d7bf] uppercase">
                                    <span className="size-1 rounded-full bg-[#7fb89a] shadow-[0_0_6px_2px_rgba(127,184,154,0.55)]" />
                                    live
                                </span>
                            </div>

                            <pre className="font-[family-name:var(--font-jetbrains-mono)] overflow-x-auto px-5 py-6 text-[12.5px] leading-[1.7] text-stone-50/75 md:px-8 md:py-8 md:text-[13px]">
                                <code>
                                    <span className="text-[#9fbeae]/65 italic">// reactive query — all marketing-grade speed</span>
                                    {"\n"}
                                    <span className="text-[#a3d7bf]">export const</span>
                                    <span className="text-stone-50"> listForUser</span>
                                    <span className="text-stone-50/45"> = </span>
                                    <span className="text-[#a3d7bf]">query</span>
                                    <span className="text-stone-50/45">({"{"}</span>
                                    {"\n"}
                                    <span className="text-stone-50">  args: </span>
                                    <span className="text-stone-50/45">{"{ "}</span>
                                    <span className="text-stone-50">cohort: v.</span>
                                    <span className="text-[#7fb89a]">string</span>
                                    <span className="text-stone-50/45">{"() }"}</span>
                                    <span className="text-stone-50/45">,</span>
                                    {"\n"}
                                    <span className="text-stone-50">  handler: </span>
                                    <span className="text-stone-50/45">async (</span>
                                    <span className="text-stone-50">ctx, </span>
                                    <span className="text-stone-50/45">{"{ "}</span>
                                    <span className="text-stone-50">cohort</span>
                                    <span className="text-stone-50/45">{" }"}</span>
                                    <span className="text-stone-50/45">) =&gt; {"{"}</span>
                                    {"\n"}
                                    <span className="text-[#a3d7bf]">    const </span>
                                    <span className="text-stone-50">user </span>
                                    <span className="text-stone-50/45">= </span>
                                    <span className="text-[#a3d7bf]">await </span>
                                    <span className="text-[#7fb89a]">requireUser</span>
                                    <span className="text-stone-50/45">(ctx);</span>
                                    {"\n"}
                                    <span className="text-[#a3d7bf]">    return </span>
                                    <span className="text-stone-50">ctx.db</span>
                                    {"\n"}
                                    <span className="text-stone-50">      .</span>
                                    <span className="text-[#7fb89a]">query</span>
                                    <span className="text-stone-50/45">(</span>
                                    <span className="text-[#d4c59c]">"cards"</span>
                                    <span className="text-stone-50/45">)</span>
                                    {"\n"}
                                    <span className="text-stone-50">      .</span>
                                    <span className="text-[#7fb89a]">withIndex</span>
                                    <span className="text-stone-50/45">(</span>
                                    <span className="text-[#d4c59c]">"by_user_cohort"</span>
                                    <span className="text-stone-50/45">, q =&gt; q</span>
                                    {"\n"}
                                    <span className="text-stone-50/45">        .</span>
                                    <span className="text-[#7fb89a]">eq</span>
                                    <span className="text-stone-50/45">(</span>
                                    <span className="text-[#d4c59c]">"userId"</span>
                                    <span className="text-stone-50/45">, user._id)</span>
                                    {"\n"}
                                    <span className="text-stone-50/45">        .</span>
                                    <span className="text-[#7fb89a]">eq</span>
                                    <span className="text-stone-50/45">(</span>
                                    <span className="text-[#d4c59c]">"cohort"</span>
                                    <span className="text-stone-50/45">, cohort))</span>
                                    {"\n"}
                                    <span className="text-stone-50">      .</span>
                                    <span className="text-[#7fb89a]">collect</span>
                                    <span className="text-stone-50/45">();</span>
                                    {"\n"}
                                    <span className="text-stone-50/45">  {"}"},</span>
                                    {"\n"}
                                    <span className="text-stone-50/45">{"});"}</span>
                                </code>
                            </pre>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
};

// ────────────────────────────────────────────────────────────────────────────
//  ROADMAP — vertical timeline
// ────────────────────────────────────────────────────────────────────────────

const RoadmapPanel = () => {
    const items: { phase: string; title: string; status: "shipped" | "now" | "next"; note: string }[] = [
        { phase: "Q4 2025", title: "Plaid sync + card vault", status: "shipped", note: "Webhooks, statement cycles, statement enrichment." },
        { phase: "Q1 2026", title: "Pockets + dashboards", status: "shipped", note: "Drag-to-reorder, custom groups, utilization dashboards." },
        { phase: "Q2 2026", title: "Agent layer", status: "now", note: "Categorisation, anomalies, payment nudges. Currently in cohort 04." },
        { phase: "Q3 2026", title: "Net worth + investments", status: "next", note: "Holdings sync, allocations, multi-currency. Plaid Investments add-on." },
        { phase: "Q4 2026", title: "Self-host docker bundle", status: "next", note: "One-command stack with Convex self-hosted + Clerk fallback." },
    ];

    return (
        <section id="roadmap" className="relative py-24 md:py-32">
            <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
                <Reveal stagger="[data-stagger]" className="flex max-w-2xl flex-col items-start">
                    <div data-stagger>{sectionLabel("03", "Where it's going")}</div>
                    <h2
                        data-stagger
                        className="mt-6 font-[family-name:var(--font-geist)] text-[34px] leading-[1.05] font-medium tracking-[-0.02em] text-stone-50 md:text-[44px]"
                        style={{ textWrap: "balance" }}
                    >
                        Roadmap, in plain ink.
                    </h2>
                    <p
                        data-stagger
                        className="mt-5 max-w-[52ch] font-[family-name:var(--font-geist)] text-[16px] leading-[1.55] text-stone-50/55"
                        style={{ textWrap: "pretty" }}
                    >
                        Slow, deliberate, no quarterly hype cycles. Everything ships under MIT. Everything has a corresponding GitHub issue.
                    </p>
                </Reveal>

                <Reveal stagger="[data-row]" className="mt-14 md:mt-20">
                    <ol className="relative flex flex-col gap-px overflow-hidden rounded-2xl border border-[#7fb89a]/[0.12] bg-[#7fb89a]/[0.04]">
                        {items.map((item, i) => (
                            <li
                                key={item.title}
                                data-row
                                className="group relative grid grid-cols-[88px_1fr_auto] items-baseline gap-4 bg-[#0c1014] px-5 py-6 transition-colors duration-200 hover:bg-[#10171c] md:grid-cols-[120px_1fr_auto] md:gap-6 md:px-8 md:py-7"
                            >
                                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] tracking-[0.18em] text-[#d4c59c]/55 uppercase">
                                    {item.phase}
                                </span>
                                <div>
                                    <h3 className="font-[family-name:var(--font-geist)] text-[16px] font-medium leading-[1.4] text-stone-50 md:text-[18px]">
                                        {item.title}
                                    </h3>
                                    <p className="mt-1.5 font-[family-name:var(--font-geist)] text-[13px] leading-[1.55] text-stone-50/50 md:text-[14px]">
                                        {item.note}
                                    </p>
                                </div>
                                <span
                                    className={cx(
                                        "font-[family-name:var(--font-jetbrains-mono)] inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] tracking-[0.18em] uppercase",
                                        item.status === "shipped" && "border-[#d4c59c]/[0.18] bg-[#d4c59c]/[0.06] text-[#d4c59c]/85",
                                        item.status === "now" && "border-[#7fb89a]/45 bg-[#7fb89a]/[0.10] text-[#a3d7bf]",
                                        item.status === "next" && "border-stone-50/[0.10] bg-transparent text-stone-50/35",
                                    )}
                                >
                                    {item.status === "now" && <span className="size-1.5 rounded-full bg-[#7fb89a] shadow-[0_0_6px_2px_rgba(127,184,154,0.5)]" />}
                                    {item.status}
                                </span>
                                {i < items.length - 1 && (
                                    <span aria-hidden="true" className="absolute inset-x-5 bottom-0 h-px bg-[#7fb89a]/[0.06] md:inset-x-8" />
                                )}
                            </li>
                        ))}
                    </ol>
                </Reveal>
            </div>
        </section>
    );
};

// ────────────────────────────────────────────────────────────────────────────
//  CTA
// ────────────────────────────────────────────────────────────────────────────

const ClosingCta = () => (
    <section className="relative overflow-hidden py-24 md:py-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[440px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7fb89a]/[0.10] blur-[140px]" />
            <div className="absolute right-[8%] top-[10%] h-[280px] w-[280px] rounded-full bg-[#d4c59c]/[0.06] blur-[100px]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-4 md:px-8">
            <Reveal stagger="[data-stagger]">
                <div className="overflow-hidden rounded-3xl border border-[#7fb89a]/[0.12] bg-gradient-to-b from-[#7fb89a]/[0.05] to-[#d4c59c]/[0.02] p-px">
                    <div className="relative rounded-3xl bg-[#0c1014] px-8 py-14 md:px-16 md:py-20">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#d4c59c]/40 to-transparent"
                        />

                        <div data-stagger className="font-[family-name:var(--font-jetbrains-mono)] flex items-center gap-3 text-[11px] tracking-[0.22em] text-[#a3d7bf] uppercase">
                            <span>04</span>
                            <span className="h-px w-12 bg-gradient-to-r from-[#7fb89a]/40 via-[#d4c59c]/25 to-transparent" />
                            <span className="text-[#d4c59c]/55">Cohort 04 closes May 17</span>
                        </div>

                        <h2
                            data-stagger
                            className="font-[family-name:var(--font-geist)] mt-7 max-w-[18ch] text-[36px] leading-[1.02] font-medium tracking-[-0.025em] text-stone-50 md:text-[56px]"
                            style={{ textWrap: "balance" }}
                        >
                            Stop renting a view of{" "}
                            <span className="font-[family-name:var(--font-source-serif)] italic font-light text-[#d4c59c]/95">your own money</span>.
                        </h2>

                        <p
                            data-stagger
                            className="mt-6 max-w-[52ch] font-[family-name:var(--font-geist)] text-[16px] leading-[1.55] text-stone-50/55 md:text-[18px]"
                            style={{ textWrap: "pretty" }}
                        >
                            Twenty-five seats per cohort. We send a quiet onboarding email, a Plaid sandbox key, and a calendar link if you want
                            to sit down on a call.
                        </p>

                        <Form
                            data-stagger
                            onSubmit={(e: FormEvent<HTMLFormElement>) => {
                                e.preventDefault();
                                e.currentTarget.reset();
                            }}
                            className="mt-10 flex w-full max-w-[520px] flex-col gap-3 sm:flex-row"
                        >
                            <Input
                                isRequired
                                size="md"
                                name="email"
                                type="email"
                                placeholder="you@workbench.dev"
                                wrapperClassName="py-0.5 flex-1"
                            />
                            <Button
                                type="submit"
                                size="lg"
                                className="!bg-gradient-to-b !from-stone-50 !to-stone-200 !text-[#0a1410] !ring-white/30 hover:!from-white hover:!to-stone-100 shadow-[0_8px_24px_rgba(127,184,154,0.18),inset_0_1px_0_rgba(255,255,255,0.6)]"
                            >
                                Reserve a seat
                            </Button>
                        </Form>

                        <p
                            data-stagger
                            className="mt-6 font-[family-name:var(--font-jetbrains-mono)] text-[11px] tracking-[0.16em] text-stone-50/35 uppercase"
                        >
                            By submitting you agree to our{" "}
                            <Link
                                href="/privacy"
                                className="rounded-xs underline-offset-2 outline-focus-ring underline transition-colors duration-150 hover:text-[#a3d7bf] focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                privacy charter
                            </Link>
                            {" · "}
                            <Link
                                href="/terms"
                                className="rounded-xs underline-offset-2 outline-focus-ring underline transition-colors duration-150 hover:text-[#a3d7bf] focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                terms
                            </Link>
                        </p>
                    </div>
                </div>
            </Reveal>
        </div>
    </section>
);

// ────────────────────────────────────────────────────────────────────────────
//  PAGE
// ────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
    return (
        <div className="relative isolate overflow-hidden bg-[#080a0c]">
            <Grain />
            <HeroVault />
            <InstrumentTicker />
            <ProductInstruments />
            <StackPanel />
            <RoadmapPanel />
            <ClosingCta />
        </div>
    );
}
