"use client";

import type { FC } from "react";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { LifeBuoy01, LogOut01, Settings01 } from "@untitledui/icons";
import { AnimatePresence, motion } from "motion/react";
import { Button as AriaButton, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { cx } from "../../../../../utils/cx";
import { Avatar } from "../../../base/avatar/avatar";
import { AvatarLabelGroup } from "../../../base/avatar/avatar-label-group";
import { Button } from "../../../base/buttons/button";
import { ButtonUtility } from "../../../base/buttons/button-utility";
import { SmartPocketsLogo, SmartPocketsLogoWithBadge } from "../../../foundations/logo";
import { MobileNavigationHeader } from "../base-components/mobile-header";
import { NavAccountMenu } from "../base-components/nav-account-card";
import { NavItemBase } from "../base-components/nav-item";
import { NavItemButton } from "../base-components/nav-item-button";
import { NavList } from "../base-components/nav-list";
import type { NavItemType } from "../config";

interface SidebarNavigationSlimProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** List of items to display. */
    items: (NavItemType & { icon: FC<{ className?: string }> })[];
    /** List of footer items to display. */
    footerItems?: (NavItemType & { icon: FC<{ className?: string }> })[];
    /** Whether to hide the border. */
    hideBorder?: boolean;
    /** Whether to hide the right side border. */
    hideRightBorder?: boolean;
}

export const SidebarSlimDesktop = ({ activeUrl, items, footerItems = [], hideBorder, hideRightBorder }: SidebarNavigationSlimProps) => {
    const activeItem = [...items, ...footerItems].find((item) => item.href === activeUrl || item.items?.some((subItem) => subItem.href === activeUrl));
    const { user } = useUser();
    const [currentItem, setCurrentItem] = useState(activeItem || items[1]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!activeItem) return;
        setCurrentItem((prev) => (prev?.href === activeItem.href ? prev : activeItem));
    }, [activeItem?.href]);

    const isSecondarySidebarVisible = isOpen && Boolean(currentItem?.items?.length);

    const handleItemClick = (item: any) => {
        if (item.onClick) {
            item.onClick();
        } else {
            if (currentItem?.label === item.label) {
                setIsOpen(!isOpen);
            } else {
                setCurrentItem(item);
                setIsOpen(true);
            }
        }
    };

    const MAIN_SIDEBAR_WIDTH = 68;
    const SECONDARY_SIDEBAR_WIDTH = 268;

    return (
        <div className="flex h-full">
            <aside
                style={{
                    width: MAIN_SIDEBAR_WIDTH,
                }}
                className="bg-primary group flex h-full max-h-full max-w-full overflow-y-auto py-1 pl-1"
            >
                <div
                    className={cx(
                        "ring-secondary flex w-auto flex-col justify-between rounded-xl pt-5 ring-1 ring-inset transition duration-300",
                        hideBorder && !isSecondarySidebarVisible && "ring-transparent",
                    )}
                >
                    <div className="flex justify-center px-3">
                        <SmartPocketsLogo size="sm" collapsed />
                    </div>

                    <ul className="mt-4 flex flex-col gap-0.5 px-3">
                        {items.map((item, index) => (
                            <li key={String(item.label ?? "") + (item.href ?? index)}>
                                <NavItemButton
                                    size="md"
                                    current={currentItem?.href === item.href}
                                    href={item.href}
                                    label={String(item.label ?? "")}
                                    icon={item.icon}
                                    onClick={() => handleItemClick(item)}
                                />
                            </li>
                        ))}
                    </ul>
                    <div className="mt-auto flex flex-col gap-4 px-3 py-5">
                        {footerItems.length > 0 && (
                            <ul className="flex flex-col gap-0.5">
                                {footerItems.map((item, index) => (
                                    <li key={String(item.label ?? "") + (item.href ?? index)}>
                                        <NavItemButton
                                            size="md"
                                            current={currentItem?.href === item.href}
                                            label={String(item.label ?? "")}
                                            href={item.href}
                                            icon={item.icon}
                                            onClick={() => handleItemClick(item)}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}

                        <AriaDialogTrigger>
                            <AriaButton
                                className={({ isPressed, isFocused }) =>
                                    cx("group relative inline-flex rounded-full", (isPressed || isFocused) && "outline-focus-ring outline-2 outline-offset-2")
                                }
                            >
                                {user ? (
                                    <Avatar status="online" src={user.imageUrl} size="md" alt={user.fullName ?? "User"} />
                                ) : (
                                    <div className="bg-secondary h-10 w-10 animate-pulse rounded-full" />
                                )}
                            </AriaButton>
                            <AriaPopover
                                placement="right bottom"
                                offset={8}
                                crossOffset={6}
                                className={({ isEntering, isExiting }) =>
                                    cx(
                                        "will-change-transform",
                                        isEntering &&
                                            "animate-in fade-in placement-right:slide-in-from-left-2 placement-top:slide-in-from-bottom-2 placement-bottom:slide-in-from-top-2 duration-300 ease-out",
                                        isExiting &&
                                            "animate-out fade-out placement-right:slide-out-to-left-2 placement-top:slide-out-to-bottom-2 placement-bottom:slide-out-to-top-2 duration-150 ease-in",
                                    )
                                }
                            >
                                <NavAccountMenu />
                            </AriaPopover>
                        </AriaDialogTrigger>
                    </div>
                </div>
            </aside>

            <AnimatePresence initial={false}>
                {isSecondarySidebarVisible && (
                    <motion.div
                        key="secondary-sidebar"
                        initial={{ width: 0, borderColor: "var(--color-border-secondary)" }}
                        animate={{ width: SECONDARY_SIDEBAR_WIDTH, borderColor: "var(--color-border-secondary)" }}
                        exit={{
                            width: 0,
                            borderColor: "rgba(0,0,0,0)",
                            transition: { borderColor: { type: "tween", delay: 0.05 } },
                        }}
                        transition={{ type: "spring", damping: 26, stiffness: 220, bounce: 0 }}
                        className={cx(
                            "bg-primary relative h-full overflow-y-auto overflow-x-hidden",
                            !(hideBorder || hideRightBorder) && "box-content border-r-[1.5px]",
                        )}
                    >
                        <div style={{ width: SECONDARY_SIDEBAR_WIDTH }} className="flex h-full flex-col px-4 pt-6">
                            <h3 className="text-brand-secondary text-sm font-semibold">{currentItem?.label}</h3>
                            <ul className="py-2">
                                {currentItem?.items?.map((item, index) => (
                                    <li key={String(item.label ?? "") + (item.href ?? index)} className="py-0.5">
                                        <NavItemBase
                                            current={activeUrl === item.href}
                                            href={item.href}
                                            icon={"icon" in item ? item.icon : undefined}
                                            badge={item.badge}
                                            type="link"
                                        >
                                            {item.label}
                                        </NavItemBase>
                                    </li>
                                ))}
                            </ul>
                            <div className="border-secondary bg-primary sticky bottom-0 mt-auto flex justify-between border-t px-2 py-5">
                                <div>
                                    <p className="text-primary text-sm font-semibold">Olivia Rhye</p>
                                    <p className="text-tertiary text-sm">olivia@untitledui.com</p>
                                </div>
                                <div className="absolute right-0 top-2.5">
                                    <ButtonUtility size="sm" color="tertiary" tooltip="Log out" icon={LogOut01} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const SidebarNavigationSlim = (props: SidebarNavigationSlimProps) => {
    const { items, activeUrl } = props;
    const MAIN_SIDEBAR_WIDTH = 68;
    return (
        <>
            {/* Desktop sidebar navigation */}
            <div className="z-50 hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex">
                <SidebarSlimDesktop {...props} />
            </div>

            {/* Placeholder to take up physical space because the real sidebar has `fixed` position. */}
            <div
                style={{
                    paddingLeft: MAIN_SIDEBAR_WIDTH,
                }}
                className="invisible hidden lg:sticky lg:bottom-0 lg:left-0 lg:top-0 lg:block"
            />

            {/* Mobile header navigation */}
            <MobileNavigationHeader>
                <aside className="bg-primary group flex h-full max-h-full w-full max-w-full flex-col justify-between overflow-y-auto pt-4">
                    <div className="px-4">
                        <SmartPocketsLogoWithBadge size="md" />
                    </div>

                    <NavList items={items} />

                    <div className="mt-auto flex flex-col gap-5 px-2 py-4">
                        <div className="flex flex-col gap-2">
                            <NavItemBase current={activeUrl === "/support"} type="link" href="/support" icon={LifeBuoy01}>
                                Support
                            </NavItemBase>
                            <NavItemBase current={activeUrl === "/settings"} type="link" href="/settings" icon={Settings01}>
                                Settings
                            </NavItemBase>
                        </div>

                        <div className="border-secondary relative flex items-center gap-3 border-t pl-2 pr-8 pt-6">
                            <AvatarLabelGroup
                                status="online"
                                size="md"
                                src="https://www.untitledui.com/images/avatars/olivia-rhye?fm=webp&q=80"
                                title="Olivia Rhye"
                                subtitle="olivia@untitledui.com"
                            />

                            <div className="absolute right-0 top-1/2 -translate-y-1/2">
                                <Button
                                    size="sm"
                                    color="tertiary"
                                    iconLeading={<LogOut01 className="text-fg-quaternary transition-inherit-all group-hover:text-fg-quaternary_hover size-5" />}
                                    className="p-1.5!"
                                />
                            </div>
                        </div>
                    </div>
                </aside>
            </MobileNavigationHeader>
        </>
    );
};
