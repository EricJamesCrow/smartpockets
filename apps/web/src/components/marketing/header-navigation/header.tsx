"use client";

import { ArrowUpRight } from "@untitledui/icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { SmartPocketsLogoWithBadge } from "@repo/ui/untitledui/foundations/logo/alpha-badge";
import { cx } from "@repo/ui/utils";

const navItems = [
    { label: "Product", href: "/#features" },
    { label: "Agent", href: "/#agentic" },
    { label: "Repo", href: "https://github.com/EricJamesCrow/smartpockets", external: true },
    { label: "About", href: "/about" },
];

export const Header = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 12);
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, [isOpen]);

    return (
        <header className="sticky top-3 z-40 px-3 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <nav
                    aria-label="Primary"
                    className={cx(
                        "rounded-full border border-white/10 px-3 py-2 backdrop-blur-2xl transition-[background-color,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                        isScrolled
                            ? "border-white/[0.14] bg-white/[0.09] shadow-[0_24px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.16)]"
                            : "bg-white/[0.07] shadow-[0_18px_60px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12)]",
                    )}
                >
                    <div className="flex items-center justify-between gap-4">
                        <Link
                            href="/"
                            className="outline-focus-ring inline-flex items-center rounded-full pl-1 focus-visible:outline-2 focus-visible:outline-offset-4"
                            aria-label="SmartPockets home"
                        >
                            <SmartPocketsLogoWithBadge size="md" />
                        </Link>

                        <ul className="hidden items-center gap-0.5 lg:flex" role="list">
                            {navItems.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        target={item.external ? "_blank" : undefined}
                                        rel={item.external ? "noopener noreferrer" : undefined}
                                        className="group outline-focus-ring relative inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[0.875rem] font-medium tracking-[-0.005em] text-gray-300 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                                    >
                                        <span className="relative">
                                            {item.label}
                                            <span
                                                aria-hidden="true"
                                                className="pointer-events-none absolute -bottom-1 left-1/2 h-px w-0 -translate-x-1/2 bg-brand-400 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:w-3"
                                            />
                                        </span>
                                        {item.external && (
                                            <ArrowUpRight aria-hidden="true" className="size-3 text-gray-500 transition-colors duration-200 group-hover:text-brand-300" />
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <div className="hidden items-center gap-1.5 md:flex">
                            <Button
                                href="/sign-in"
                                color="link-gray"
                                size="md"
                                className="h-10 rounded-full px-4 text-[0.875rem] text-gray-300 hover:text-white"
                            >
                                Log in
                            </Button>
                            <Button
                                href="/sign-up"
                                size="md"
                                className="h-10 rounded-full bg-white px-4 text-[0.875rem] text-gray-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_2px_8px_rgba(34,211,141,0.18)] ring-white/20 transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-50 active:scale-[0.97]"
                            >
                                Request access
                            </Button>
                        </div>

                        <button
                            type="button"
                            aria-label={isOpen ? "Close navigation" : "Open navigation"}
                            aria-expanded={isOpen}
                            aria-controls="mobile-nav-panel"
                            onClick={() => setIsOpen((value) => !value)}
                            className="outline-focus-ring group relative ml-auto inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] transition-[background-color,transform,border-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-white/20 hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] md:hidden"
                        >
                            <span className="sr-only">Menu</span>
                            <span
                                aria-hidden="true"
                                className={cx(
                                    "absolute h-px w-4 origin-center rounded-full bg-white transition-[transform,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                                    isOpen ? "translate-y-0 rotate-45" : "-translate-y-[5px] rotate-0",
                                )}
                            />
                            <span
                                aria-hidden="true"
                                className={cx(
                                    "absolute h-px rounded-full bg-white transition-[opacity,width,transform] duration-200",
                                    isOpen ? "w-0 -translate-x-2 opacity-0" : "w-3 opacity-100",
                                )}
                            />
                            <span
                                aria-hidden="true"
                                className={cx(
                                    "absolute h-px w-4 origin-center rounded-full bg-white transition-[transform,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                                    isOpen ? "translate-y-0 -rotate-45" : "translate-y-[5px] rotate-0",
                                )}
                            />
                        </button>
                    </div>

                    <div
                        id="mobile-nav-panel"
                        aria-hidden={!isOpen}
                        className={cx(
                            "grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden",
                            isOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0",
                        )}
                    >
                        <div className="min-h-0 overflow-hidden">
                            <div className="rounded-[1.5rem] border border-white/10 bg-[#08100d]/95 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                <ul className="flex flex-col gap-1" role="list">
                                    {navItems.map((item) => (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                target={item.external ? "_blank" : undefined}
                                                rel={item.external ? "noopener noreferrer" : undefined}
                                                onClick={() => setIsOpen(false)}
                                                className="outline-focus-ring flex items-center justify-between rounded-2xl px-4 py-3 text-base font-medium text-gray-100 transition-colors duration-200 hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2"
                                            >
                                                <span>{item.label}</span>
                                                {item.external && <ArrowUpRight aria-hidden="true" className="size-4 text-gray-500" />}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <Button
                                        href="/sign-in"
                                        color="secondary"
                                        size="md"
                                        className="rounded-full border-white/10 bg-white/[0.06] text-white ring-white/10 hover:bg-white/[0.12]"
                                    >
                                        Log in
                                    </Button>
                                    <Button
                                        href="/sign-up"
                                        size="md"
                                        className="rounded-full bg-white text-gray-950 hover:bg-brand-50"
                                    >
                                        Request access
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
            </div>
        </header>
    );
};
