"use client";

import type { ReactNode } from "react";
import { SearchLg } from "@untitledui/icons";
import { Input } from "../../../base/input/input";
import { UntitledLogo } from "../../../foundations/logo/untitledui-logo";
import { cx } from "../../../../../utils/cx";
import { MobileNavigationHeader } from "../base-components/mobile-header";
import { NavAccountCard } from "../base-components/nav-account-card";
import { NavItemBase } from "../base-components/nav-item";
import { NavList } from "../base-components/nav-list";
import type { NavItemType } from "../config";

interface SidebarNavigationProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** List of items to display. */
    items: NavItemType[];
    /** List of footer items to display. */
    footerItems?: NavItemType[];
    /** Feature card to display. */
    featureCard?: ReactNode;
    /** Whether to show the account card. */
    showAccountCard?: boolean;
    /** Whether to hide the right side border. */
    hideBorder?: boolean;
    /** Additional CSS classes to apply to the sidebar. */
    className?: string;
    /** Callback when search is clicked - converts input to a clickable trigger. */
    onSearchClick?: () => void;
    /** Custom children to render after nav items (e.g., History section). */
    children?: ReactNode;
}


export const SidebarSimpleDesktop = ({
    activeUrl,
    items,
    footerItems = [],
    featureCard,
    showAccountCard = true,
    hideBorder = false,
    className,
    onSearchClick,
    children,
    style,
}: SidebarNavigationProps & { style?: React.CSSProperties }) => {
    const MAIN_SIDEBAR_WIDTH = 296;

    return (
        <aside
            style={
                {
                    "--width": `${MAIN_SIDEBAR_WIDTH}px`,
                    ...style,
                } as React.CSSProperties
            }
            className={cx(
                "flex h-full w-full max-w-full flex-col justify-between overflow-auto bg-primary pt-4 lg:w-(--width) lg:pt-6",
                !hideBorder && "border-secondary md:border-r",
                className,
            )}
        >
            <div className="flex flex-col gap-5 px-4 lg:px-5">
                <UntitledLogo className="h-8" />
                {onSearchClick ? (
                    <button
                        type="button"
                        onClick={onSearchClick}
                        className="flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2 text-md text-placeholder shadow-xs ring-1 ring-primary ring-inset transition-shadow duration-100 ease-linear hover:ring-2 hover:ring-brand"
                    >
                        <SearchLg className="size-5 text-fg-quaternary" />
                        <span className="flex-1 text-left">Search</span>
                        <span className="rounded px-1 py-px text-xs font-medium text-quaternary ring-1 ring-secondary ring-inset">
                            ⌘K
                        </span>
                    </button>
                ) : (
                    <Input shortcut size="sm" aria-label="Search" placeholder="Search" icon={SearchLg} />
                )}
            </div>

            <NavList activeUrl={activeUrl} items={items} />

            {children}

            <div className="mt-auto flex flex-col gap-4 px-2 py-4 lg:px-4 lg:py-6">
                {footerItems.length > 0 && (
                    <ul className="flex flex-col">
                        {footerItems.map((item, index) => (
                            <li key={String(item.label ?? "") + (item.href ?? index)} className="py-0.5">
                                <NavItemBase
                                    badge={item.badge}
                                    icon={item.icon}
                                    href={item.href}
                                    type="link"
                                    current={item.href === activeUrl}
                                    onClick={item.onClick}
                                >
                                    {item.label}
                                </NavItemBase>
                            </li>
                        ))}
                    </ul>
                )}

                {featureCard}

                {showAccountCard && <NavAccountCard />}
            </div>
        </aside>
    );
};

export const SidebarNavigationSimple = (props: SidebarNavigationProps) => {
    const MAIN_SIDEBAR_WIDTH = 296;

    const content = <SidebarSimpleDesktop {...props} />;

    return (
        <>
            {/* Mobile header navigation */}
            <MobileNavigationHeader>{content}</MobileNavigationHeader>

            {/* Desktop sidebar navigation */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex">{content}</div>

            {/* Placeholder to take up physical space because the real sidebar has `fixed` position. */}
            <div
                style={{
                    paddingLeft: MAIN_SIDEBAR_WIDTH,
                }}
                className="invisible hidden lg:sticky lg:top-0 lg:bottom-0 lg:left-0 lg:block"
            />
        </>
    );
};
