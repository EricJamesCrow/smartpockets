"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button as AriaButton, Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { SmartPocketsLogoWithBadge } from "@repo/ui/untitledui/foundations/logo/alpha-badge";
import { cx } from "@repo/ui/utils";

type HeaderNavItem = {
    label: string;
    href: string;
    accent?: boolean;
};

const headerNavItems: HeaderNavItem[] = [
    { label: "Product", href: "#product" },
    { label: "Architecture", href: "#stack" },
    { label: "Roadmap", href: "#roadmap" },
    { label: "Github", href: "https://github.com/EricJamesCrow/smartpockets" },
];

const MobileNavItem = ({ label, href, onClose }: { label: string; href: string; onClose?: () => void }) => (
    <li>
        <a
            href={href}
            onClick={onClose}
            className="font-[family-name:var(--font-geist)] flex items-center justify-between border-b border-white/[0.04] px-4 py-4 text-base font-medium text-white/85 transition-colors duration-150 hover:bg-white/[0.04] hover:text-white"
        >
            {label}
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] tracking-widest text-white/30">→</span>
        </a>
    </li>
);

const MobileFooter = () => (
    <div className="flex flex-col gap-3 px-4 pt-6 pb-8">
        <Button href="/sign-up" size="lg">
            Request access
        </Button>
        <Button href="/sign-in" color="secondary" size="lg">
            Sign in
        </Button>
    </div>
);

export const Header = () => {
    const headerRef = useRef<HTMLElement>(null);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header
            ref={headerRef}
            className={cx(
                "sticky top-0 z-40 flex h-16 w-full items-center justify-center transition-all duration-300 md:h-18",
                scrolled
                    ? "bg-[#0a0b0d]/85 backdrop-blur-xl border-b border-white/[0.06]"
                    : "bg-transparent border-b border-transparent",
            )}
        >
            <div className="flex size-full max-w-[1280px] flex-1 items-center pr-3 pl-4 md:px-8">
                <div className="flex w-full items-center justify-between gap-4">
                    <div className="flex flex-1 items-center gap-8">
                        <Link href="/" aria-label="SmartPockets home" className="rounded-md outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2">
                            <SmartPocketsLogoWithBadge size="md" />
                        </Link>

                        {/* Desktop navigation */}
                        <nav className="max-md:hidden">
                            <ul className="flex items-center gap-0.5">
                                {headerNavItems.map((item) => (
                                    <li key={item.label}>
                                        <a
                                            href={item.href}
                                            className="group relative flex items-center gap-1.5 rounded-md px-3 py-1.5 font-[family-name:var(--font-geist)] text-[13px] font-medium text-white/65 outline-focus-ring transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                                        >
                                            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-white/25 transition-colors duration-150 group-hover:text-brand-400">
                                                /
                                            </span>
                                            {item.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden items-center gap-2 md:flex">
                        <Button href="/sign-in" color="link-gray" size="md">
                            Sign in
                        </Button>
                        <Button href="/sign-up" color="primary" size="md">
                            Request access
                        </Button>
                    </div>

                    {/* Mobile trigger */}
                    <AriaDialogTrigger>
                        <AriaButton
                            aria-label="Toggle navigation menu"
                            className={({ isFocusVisible, isHovered }) =>
                                cx(
                                    "group ml-auto cursor-pointer rounded-md p-2 md:hidden",
                                    isHovered && "bg-white/[0.06]",
                                    isFocusVisible && "outline-2 outline-offset-2 outline-focus-ring",
                                )
                            }
                        >
                            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none">
                                <path
                                    className="hidden text-white group-aria-expanded:block"
                                    d="M18 6L6 18M6 6L18 18"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    className="text-white group-aria-expanded:hidden"
                                    d="M4 8H20M4 16H14"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </AriaButton>
                        <AriaPopover
                            triggerRef={headerRef}
                            className="scrollbar-hide w-full overflow-y-auto md:hidden"
                            offset={0}
                            crossOffset={20}
                            containerPadding={0}
                            placement="bottom left"
                        >
                            <AriaDialog className="outline-hidden">
                                {({ close }) => (
                                    <nav className="w-full border-b border-white/[0.06] bg-[#0a0b0d] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
                                        <ul className="flex flex-col py-2">
                                            {headerNavItems.map((item) => (
                                                <MobileNavItem key={item.label} label={item.label} href={item.href} onClose={close} />
                                            ))}
                                        </ul>
                                        <MobileFooter />
                                    </nav>
                                )}
                            </AriaDialog>
                        </AriaPopover>
                    </AriaDialogTrigger>
                </div>
            </div>
        </header>
    );
};

export type { HeaderNavItem };
