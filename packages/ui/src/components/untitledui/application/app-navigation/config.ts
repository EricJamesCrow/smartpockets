import type { FC, MouseEventHandler, ReactNode } from "react";

export type NavItemType = {
    /** Label text for the nav item. */
    label: ReactNode;
    /** Whether to truncate the label text. */
    truncate?: boolean;
    /** URL to navigate to when the nav item is clicked. */
    href?: string;
    /** Icon component to display. */
    icon?: FC<{ className?: string }>;
    /** Badge to display. */
    badge?: ReactNode;
    /** List of sub-items to display. */
    items?: (NavItemType | NavItemDividerType)[];
    /** Whether this nav item is a divider. */
    divider?: boolean;
    /** Handler for click events (for action items without href). */
    onClick?: MouseEventHandler;
    /** Whether the nav item is disabled. */
    disabled?: boolean;
    /** Optional action component to display (e.g. menu). */
    action?: ReactNode;
};

export type NavItemDividerType = Omit<NavItemType, "icon" | "label" | "divider"> & {
    /** Label text for the divider. */
    label?: string;
    /** Whether this nav item is a divider. */
    divider: true;
};
