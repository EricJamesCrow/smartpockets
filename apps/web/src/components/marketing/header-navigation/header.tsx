"use client";

import { useState } from "react";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { SmartPocketsLogoWithBadge } from "@repo/ui/untitledui/foundations/logo/alpha-badge";
import { cx } from "@repo/ui/utils";
import { ArrowRight } from "@untitledui/icons";
import Link from "next/link";

const navItems = [
    { label: "Features", href: "/#features" },
    { label: "Agent assist", href: "/#agentic" },
    { label: "About", href: "/about" },
    { label: "Privacy", href: "/privacy" },
];

export const Header = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <header className="sticky top-3 z-40 px-3 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <nav
                    aria-label="Primary navigation"
                    className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-2 shadow-[0_24px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl"
                >
                    <div className="flex items-center justify-between gap-4">
                        <Link href="/" className="outline-focus-ring rounded-full focus-visible:outline-2 focus-visible:outline-offset-4">
                            <SmartPocketsLogoWithBadge size="md" />
                        </Link>

                        <ul className="hidden items-center gap-1 lg:flex">
                            {navItems.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className="outline-focus-ring rounded-full px-4 py-2 text-sm font-medium text-gray-300 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <div className="hidden items-center gap-2 md:flex">
                            <Button
                                href="/sign-in"
                                color="secondary"
                                size="md"
                                className="rounded-full border-white/10 bg-white/[0.06] text-white ring-white/10 transition-[background-color,transform,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.12] active:scale-[0.98]"
                            >
                                Log in
                            </Button>
                            <Button
                                href="/sign-up"
                                size="md"
                                iconTrailing={ArrowRight}
                                className="rounded-full bg-white text-gray-950 ring-white/20 transition-[background-color,transform,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-emerald-100 active:scale-[0.98]"
                            >
                                Sign up
                            </Button>
                        </div>

                        <button
                            type="button"
                            aria-label="Toggle navigation menu"
                            aria-expanded={isOpen}
                            onClick={() => setIsOpen((value) => !value)}
                            className="outline-focus-ring group relative ml-auto inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] md:hidden"
                        >
                            <span
                                className={cx(
                                    "absolute h-px w-4 rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                                    isOpen ? "translate-y-0 rotate-45" : "-translate-y-1.5 rotate-0",
                                )}
                            />
                            <span
                                className={cx("absolute h-px w-4 rounded-full bg-white transition-opacity duration-200", isOpen ? "opacity-0" : "opacity-100")}
                            />
                            <span
                                className={cx(
                                    "absolute h-px w-4 rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                                    isOpen ? "translate-y-0 -rotate-45" : "translate-y-1.5 rotate-0",
                                )}
                            />
                        </button>
                    </div>

                    {isOpen && (
                        <div className="mt-3 rounded-[1.5rem] border border-white/10 bg-[#07100d]/95 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] md:hidden">
                            <ul className="flex flex-col gap-1">
                                {navItems.map((item) => (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={() => setIsOpen(false)}
                                            className="outline-focus-ring block rounded-2xl px-4 py-3 text-base font-semibold text-gray-100 transition-colors duration-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <Button href="/sign-in" color="secondary" size="lg" className="rounded-full bg-white/[0.06] text-white ring-white/10">
                                    Log in
                                </Button>
                                <Button href="/sign-up" size="lg" className="rounded-full bg-white text-gray-950 hover:bg-emerald-100">
                                    Sign up
                                </Button>
                            </div>
                        </div>
                    )}
                </nav>
            </div>
        </header>
    );
};
