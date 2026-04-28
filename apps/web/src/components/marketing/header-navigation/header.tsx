"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { SmartPocketsLogoWithBadge } from "@repo/ui/untitledui/foundations/logo/alpha-badge";

const navItems = [
    { label: "Atelier", href: "#atelier" },
    { label: "Mechanism", href: "#mechanism" },
    { label: "Provenance", href: "#provenance" },
    { label: "Ledger", href: "#ledger" },
];

export const Header = () => {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);
    const headerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 24);
        handler();
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, []);

    return (
        <header
            ref={headerRef}
            className="sticky top-0 z-40 w-full px-3 pt-3 md:px-6 md:pt-4"
        >
            <div className="mx-auto max-w-[1280px]">
                <div
                    className={`atelier-glass relative flex items-center justify-between rounded-full border border-white/[0.08] px-3 py-2 transition-[backdrop-filter,background-color,border-color] duration-300 md:px-4 md:py-2.5 ${
                        scrolled ? "bg-black/55 backdrop-blur-xl" : "bg-black/30 backdrop-blur-md"
                    }`}
                >
                    {/* Brand */}
                    <Link
                        href="/"
                        className="group flex items-center gap-3 rounded-full pr-3 outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        <span className="atelier-monogram inline-flex size-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:size-9">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                                <path
                                    d="M7 1L13 7L7 13L1 7L7 1Z"
                                    stroke="currentColor"
                                    strokeWidth="0.8"
                                    fill="none"
                                />
                                <path d="M4.5 7L9.5 7" stroke="currentColor" strokeWidth="0.8" />
                                <path d="M7 4.5L7 9.5" stroke="currentColor" strokeWidth="0.8" />
                            </svg>
                        </span>
                        <span className="hidden md:block">
                            <SmartPocketsLogoWithBadge size="md" />
                        </span>
                        <span className="md:hidden">
                            <SmartPocketsLogoWithBadge size="sm" />
                        </span>
                    </Link>

                    {/* Desktop nav — only at lg+ to avoid collisions on tablet */}
                    <nav className="absolute left-1/2 hidden -translate-x-1/2 lg:block">
                        <ul className="flex items-center gap-1 text-[12px] tracking-[0.18em] uppercase">
                            {navItems.map((item, idx) => (
                                <li key={item.label} className="flex items-center">
                                    {idx > 0 && (
                                        <span className="mx-1 text-white/15" aria-hidden>
                                            ·
                                        </span>
                                    )}
                                    <a
                                        href={item.href}
                                        className="rounded-full px-3 py-1.5 font-[family-name:var(--font-familjen)] text-white/65 outline-focus-ring transition hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2"
                                    >
                                        {item.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Right cluster */}
                    <div className="hidden items-center gap-2 md:flex">
                        <Link
                            href="/sign-in"
                            className="rounded-full px-4 py-2 font-[family-name:var(--font-familjen)] text-[13px] tracking-[0.06em] text-white/80 outline-focus-ring transition hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/sign-up"
                            className="atelier-pill group relative inline-flex items-center gap-2 rounded-full border border-amber-200/40 bg-gradient-to-b from-amber-100/20 via-amber-200/5 to-transparent px-4 py-2 font-[family-name:var(--font-familjen)] text-[13px] tracking-[0.04em] text-amber-50 shadow-[inset_0_1px_0_rgba(255,236,179,0.25),0_1px_24px_-6px_rgba(252,211,77,0.4)] outline-focus-ring transition hover:border-amber-200/70 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            <span>Reserve</span>
                            <span className="text-amber-200/70 transition group-hover:translate-x-0.5">→</span>
                        </Link>
                    </div>

                    {/* Mobile trigger */}
                    <button
                        type="button"
                        aria-label="Open navigation"
                        aria-expanded={open}
                        onClick={() => setOpen((v) => !v)}
                        className="ml-2 inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/80 outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 md:hidden"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                            {open ? (
                                <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            ) : (
                                <>
                                    <path d="M3 5H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                    <path d="M3 11H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                </>
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile menu — glass drawer */}
                {open && (
                    <div className="atelier-mobile-menu mt-2 overflow-hidden rounded-3xl border border-white/[0.08] bg-black/70 p-3 backdrop-blur-xl md:hidden">
                        <ul className="flex flex-col">
                            {navItems.map((item) => (
                                <li key={item.label}>
                                    <a
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className="flex items-center justify-between rounded-2xl px-4 py-3 font-[family-name:var(--font-familjen)] text-[13px] tracking-[0.18em] text-white/80 uppercase hover:bg-white/[0.04] hover:text-amber-100"
                                    >
                                        <span>{item.label}</span>
                                        <span className="text-white/30">→</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-3 flex flex-col gap-2 border-t border-white/[0.06] pt-3">
                            <Button href="/sign-up" size="lg" color="primary">
                                Reserve a seat
                            </Button>
                            <Button href="/sign-in" size="lg" color="secondary">
                                Log in
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};
