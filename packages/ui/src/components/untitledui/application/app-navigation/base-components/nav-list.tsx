"use client";

import { useState } from "react";
import { cx } from "../../../../../utils/cx";
import type { NavItemDividerType, NavItemType } from "../config";
import { NavItemBase } from "./nav-item";

interface NavListProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** Additional CSS classes to apply to the list. */
    className?: string;
    /** List of items to display. */
    items: (NavItemType | NavItemDividerType)[];
}

export const NavList = ({ activeUrl, items, className }: NavListProps) => {
    const [open, setOpen] = useState(false);
    const activeItem = items.find((item) => item.href === activeUrl || item.items?.some((subItem) => subItem.href === activeUrl));
    const [currentItem, setCurrentItem] = useState(activeItem);

    return (
        <ul className={cx("mt-4 flex flex-col px-2 lg:px-4", className)}>
            {items.map((item, index) => {
                if (item.divider) {
                    return (
                        <li key={index} className="w-full px-0.5 py-2">
                            {item.label && (
                                <span className="px-2 mb-1 text-xs font-medium text-fg-quaternary uppercase tracking-wider block">
                                    {item.label}
                                </span>
                            )}
                            {!item.label && <hr className="h-px w-full border-none bg-border-secondary" />}
                        </li>
                    );
                }

                if (item.items?.length) {
                    return (
                        <details
                            key={item.href ?? index}
                            open={activeItem?.href === item.href}
                            className="appearance-none py-0.5"
                            onToggle={(e) => {
                                setOpen(e.currentTarget.open);
                                setCurrentItem(item);
                            }}
                        >
                            <NavItemBase href={item.href} badge={item.badge} icon={item.icon} type="collapsible">
                                {item.label}
                            </NavItemBase>

                            <dd>
                                <ul className="py-0.5">
                                    {item.items.map((childItem, childIndex) => {
                                        if (childItem.divider) {
                                            return (
                                                <li key={childIndex} className="w-full px-0.5 py-2">
                                                    {childItem.label && (
                                                        <span className="px-2 mb-1 text-xs font-medium text-fg-quaternary uppercase tracking-wider block">
                                                            {childItem.label}
                                                        </span>
                                                    )}
                                                    {!childItem.label && <hr className="h-px w-full border-none bg-border-secondary" />}
                                                </li>
                                            );
                                        }
                                        return (
                                            <li key={childItem.href ?? childIndex} className="py-0.5">
                                                <NavItemBase
                                                    href={childItem.href}
                                                    badge={childItem.badge}
                                                    type="collapsible-child"
                                                    current={activeUrl === childItem.href}
                                                    action={childItem.action}
                                                    truncate={childItem.truncate}
                                                >
                                                    {childItem.label}
                                                </NavItemBase>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </dd>
                        </details>
                    );
                }

                return (
                    <li key={item.href ?? index} className="py-0.5">
                        <NavItemBase
                            type="link"
                            badge={item.badge}
                            icon={item.icon}
                            href={item.href}
                            onClick={item.onClick}
                            current={currentItem?.href === item.href}
                            open={open && currentItem?.href === item.href}
                            disabled={item.disabled}
                            action={item.action}
                            truncate={item.truncate}
                        >
                            {item.label}
                        </NavItemBase>
                    </li>
                );
            })}
        </ul>
    );
};
