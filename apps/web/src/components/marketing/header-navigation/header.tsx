"use client";

import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { SmartPocketsLogo } from "@repo/ui/untitledui/foundations/logo/smartpockets-logo";
import { cx } from "@repo/ui/utils";
import Link from "next/link";
import { useState } from "react";
import { marketingPrimaryButton, marketingSecondaryButton } from "@/components/marketing/button-styles";

const navItems = [
    { label: "Principles", href: "/#manifesto" },
    { label: "Capabilities", href: "/#features" },
    { label: "Roadmap", href: "/#agentic" },
    { label: "About", href: "/about" },
];

export const Header = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#080a0c]/85 backdrop-blur-md">
            <nav
                aria-label="Primary navigation"
                className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
            >
                <Link href="/" className="outline-focus-ring rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4">
                    <SmartPocketsLogo size="md" />
                </Link>

                <ul className="hidden items-center gap-1 lg:flex">
                    {navItems.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className="outline-focus-ring rounded-full px-3 py-2 text-sm font-medium text-stone-400 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="hidden items-center gap-2.5 lg:flex">
                    <Button href="/sign-in" color="secondary" size="md" className={marketingSecondaryButton}>
                        Log in
                    </Button>
                    <Button href="/sign-up" size="md" className={marketingPrimaryButton}>
                        Request an invite
                    </Button>
                </div>

                <button
                    type="button"
                    aria-label="Toggle navigation menu"
                    aria-expanded={isOpen}
                    onClick={() => setIsOpen((value) => !value)}
                    className="outline-focus-ring relative inline-flex size-10 items-center justify-center text-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden"
                >
                    <span
                        className={cx(
                            "absolute h-px w-4 rounded-full bg-stone-200 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                            isOpen ? "translate-y-0 rotate-45" : "-translate-y-1.5 rotate-0",
                        )}
                    />
                    <span
                        className={cx(
                            "absolute h-px w-4 rounded-full bg-stone-200 transition-opacity duration-200",
                            isOpen ? "opacity-0" : "opacity-100",
                        )}
                    />
                    <span
                        className={cx(
                            "absolute h-px w-4 rounded-full bg-stone-200 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                            isOpen ? "translate-y-0 -rotate-45" : "translate-y-1.5 rotate-0",
                        )}
                    />
                </button>
            </nav>

            {isOpen && (
                <div className="border-t border-white/[0.06] bg-[#0a0d10] px-4 pb-6 pt-2 sm:px-6 lg:hidden">
                    <ul className="flex flex-col">
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className="outline-focus-ring block py-3 text-base font-medium text-stone-200 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                                >
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                        <Button href="/sign-in" color="secondary" size="lg" className={marketingSecondaryButton}>
                            Log in
                        </Button>
                        <Button href="/sign-up" size="lg" className={marketingPrimaryButton}>
                            Request an invite
                        </Button>
                    </div>
                </div>
            )}
        </header>
    );
};
