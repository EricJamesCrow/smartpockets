"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { ChevronDown } from "@untitledui/icons";
import { Button as AriaButton, Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { SmartPocketsLogoWithBadge } from "@repo/ui/untitledui/foundations/logo/alpha-badge";
import { ProductsDropdown } from "./dropdown-header-navigation";
import { cx } from "@repo/ui/utils";

type HeaderNavItem = {
    label: string;
    href?: string;
    menu?: ReactNode;
    code?: string;
};

const headerNavItems: HeaderNavItem[] = [
    { label: "Products", href: "/products", menu: <ProductsDropdown />, code: "01" },
    { label: "About", href: "/about", code: "02" },
];

const footerNavItems = [
    { label: "About us", href: "/" },
    { label: "Press", href: "/products" },
    { label: "Legal", href: "/legal" },
    { label: "Support", href: "/support" },
    { label: "Contact", href: "/contact" },
    { label: "Sitemap", href: "/sitemap" },
    { label: "Cookie settings", href: "/cookies" },
];

const MobileNavItem = (props: { className?: string; label: string; code?: string; href?: string; children?: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (props.href) {
        return (
            <li>
                <a
                    href={props.href}
                    className="flex items-center gap-3 px-4 py-3 text-md font-semibold text-primary hover:bg-primary_hover"
                >
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/70">{props.code ?? "//"}</span>
                    {props.label}
                </a>
            </li>
        );
    }

    return (
        <li className="flex flex-col gap-0.5">
            <button
                aria-expanded={isOpen}
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-md font-semibold text-primary hover:bg-primary_hover"
            >
                <span className="flex items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/70">{props.code ?? "//"}</span>
                    {props.label}
                </span>
                <ChevronDown
                    className={cx("size-4 stroke-[2.625px] text-fg-quaternary transition duration-100 ease-linear", isOpen ? "-rotate-180" : "rotate-0")}
                />
            </button>
            {isOpen && <div>{props.children}</div>}
        </li>
    );
};

const MobileFooter = () => {
    return (
        <div className="flex flex-col gap-8 border-t border-secondary px-4 py-6">
            <div>
                <ul className="grid grid-flow-col grid-cols-2 grid-rows-4 gap-x-6 gap-y-3">
                    {footerNavItems.map((navItem) => (
                        <li key={navItem.label}>
                            <Button color="link-gray" size="lg" href={navItem.href}>
                                {navItem.label}
                            </Button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="flex flex-col gap-3">
                <Button href="/sign-up" size="lg">
                    Request access
                </Button>
                <Button href="/sign-in" color="secondary" size="lg">
                    Sign in
                </Button>
            </div>
        </div>
    );
};

interface HeaderProps {
    items?: HeaderNavItem[];
    isFullWidth?: boolean;
    className?: string;
}

export const Header = ({ items = headerNavItems, isFullWidth, className }: HeaderProps) => {
    const headerRef = useRef<HTMLElement>(null);

    return (
        <header
            ref={headerRef}
            className={cx(
                "relative z-30 flex h-16 w-full items-center justify-center border-b border-white/[0.05] bg-[#06090b]/80 backdrop-blur-xl md:h-18",
                isFullWidth ? "has-aria-expanded:bg-primary" : "max-md:has-aria-expanded:bg-primary",
                className,
            )}
        >
            <div className="flex size-full max-w-container flex-1 items-center pr-3 pl-4 md:px-8">
                <div className="flex w-full items-center justify-between gap-4">
                    <div className="flex flex-1 items-center gap-6">
                        <a
                            href="/"
                            className="outline-focus-ring inline-flex items-center gap-2.5 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            <SmartPocketsLogoWithBadge size="md" />
                        </a>

                        {/* Desktop navigation */}
                        <nav className="max-md:hidden">
                            <ul className="flex items-center gap-1">
                                {items.map((navItem) => (
                                    <li key={navItem.label}>
                                        {navItem.menu ? (
                                            <AriaDialogTrigger>
                                                <AriaButton className="group flex cursor-pointer items-center gap-1.5 rounded-xs px-2.5 py-1.5 text-sm font-medium text-zinc-300 outline-focus-ring transition duration-100 ease-linear hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2">
                                                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/60 transition group-hover:text-brand-400">
                                                        {navItem.code}
                                                    </span>
                                                    <span>{navItem.label}</span>
                                                    <ChevronDown className="size-3.5 rotate-0 stroke-[2.5px] text-zinc-500 transition duration-100 ease-linear in-aria-expanded:-rotate-180" />
                                                </AriaButton>

                                                <AriaPopover
                                                    className={({ isEntering, isExiting }) =>
                                                        cx(
                                                            "hidden origin-top will-change-transform md:block",
                                                            isFullWidth && "w-full",
                                                            isEntering && "duration-200 ease-out animate-in fade-in slide-in-from-top-1",
                                                            isExiting && "duration-150 ease-in animate-out fade-out slide-out-to-top-1",
                                                        )
                                                    }
                                                    offset={8}
                                                    containerPadding={0}
                                                    triggerRef={isFullWidth ? headerRef : undefined}
                                                >
                                                    {({ isEntering, isExiting }) => (
                                                        <AriaDialog
                                                            className={cx(
                                                                "mx-auto origin-top outline-hidden",
                                                                isEntering && !isFullWidth && "duration-200 ease-out animate-in zoom-in-95",
                                                                isExiting && !isFullWidth && "duration-150 ease-in animate-out zoom-out-95",
                                                            )}
                                                        >
                                                            {navItem.menu}
                                                        </AriaDialog>
                                                    )}
                                                </AriaPopover>
                                            </AriaDialogTrigger>
                                        ) : (
                                            <a
                                                href={navItem.href}
                                                className="group flex cursor-pointer items-center gap-1.5 rounded-xs px-2.5 py-1.5 text-sm font-medium text-zinc-300 outline-focus-ring transition duration-100 ease-linear hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                                            >
                                                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/60 transition group-hover:text-brand-400">
                                                    {navItem.code}
                                                </span>
                                                <span>{navItem.label}</span>
                                            </a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>

                    <div className="hidden items-center gap-2.5 md:flex">
                        <a
                            href="https://github.com/EricJamesCrow/smartpockets"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="outline-focus-ring inline-flex items-center gap-2 rounded-xs border border-white/10 bg-white/[0.02] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-300 transition hover:border-brand-500/40 hover:bg-white/[0.04] hover:text-brand-300 focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            <span className="size-1.5 rounded-full bg-brand-400 shadow-[0_0_8px_rgba(60,203,127,0.6)]" aria-hidden="true" />
                            GitHub
                        </a>
                        <a
                            href="/sign-in"
                            className="outline-focus-ring inline-flex items-center rounded-xs px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            Sign in
                        </a>
                        <a
                            href="/sign-up"
                            className="outline-focus-ring group inline-flex items-center gap-2 rounded-xs bg-brand-500 px-3.5 py-1.5 text-sm font-semibold text-[#04140a] shadow-[0_0_0_1px_rgba(60,203,127,0.45),0_8px_24px_-8px_rgba(22,179,100,0.55)] transition hover:bg-brand-400 hover:shadow-[0_0_0_1px_rgba(60,203,127,0.65),0_10px_28px_-8px_rgba(22,179,100,0.75)] focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            Request access
                            <span className="font-mono text-[10px] tracking-[0.14em] text-[#04140a]/60">↵</span>
                        </a>
                    </div>

                    {/* Mobile menu and menu trigger */}
                    <AriaDialogTrigger>
                        <AriaButton
                            aria-label="Toggle navigation menu"
                            className={({ isFocusVisible, isHovered }) =>
                                cx(
                                    "group ml-auto cursor-pointer rounded-xs p-2 md:hidden",
                                    isHovered && "bg-white/[0.06]",
                                    isFocusVisible && "outline-2 outline-offset-2 outline-focus-ring",
                                )
                            }
                        >
                            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path
                                    className="hidden text-zinc-200 group-aria-expanded:block"
                                    d="M18 6L6 18M6 6L18 18"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    className="text-zinc-200 group-aria-expanded:hidden"
                                    d="M3 12H21M3 6H21M3 18H21"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </AriaButton>
                        <AriaPopover
                            triggerRef={headerRef}
                            className="h-calc(100%-72px) scrollbar-hide w-full overflow-y-auto shadow-lg md:hidden"
                            offset={0}
                            crossOffset={20}
                            containerPadding={0}
                            placement="bottom left"
                        >
                            <AriaDialog className="outline-hidden">
                                <nav className="w-full bg-primary shadow-lg">
                                    <ul className="flex flex-col gap-0.5 py-5">
                                        {items.map((navItem) =>
                                            navItem.menu ? (
                                                <MobileNavItem key={navItem.label} label={navItem.label} code={navItem.code}>
                                                    {navItem.menu}
                                                </MobileNavItem>
                                            ) : (
                                                <MobileNavItem key={navItem.label} label={navItem.label} code={navItem.code} href={navItem.href} />
                                            ),
                                        )}
                                    </ul>

                                    <MobileFooter />
                                </nav>
                            </AriaDialog>
                        </AriaPopover>
                    </AriaDialogTrigger>
                </div>
            </div>
        </header>
    );
};

