"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Selection } from "react-aria-components";
import {
    BarChartSquare02,
    ClockRewind,
    CreditCard01,
    Home03,
    MessageSquare02,
    Receipt,
    SearchLg,
    Settings01,
    Wallet01,
} from "@untitledui/icons";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex/_generated/api";
import type { NavItemType } from "@repo/ui/untitledui/application/app-navigation/config";
import { SidebarNavigationSimple, SidebarSimpleDesktop } from "@repo/ui/untitledui/application/app-navigation/sidebar-navigation/sidebar-simple";
import { SidebarNavigationSlim, SidebarSlimDesktop } from "@repo/ui/untitledui/application/app-navigation/sidebar-navigation/sidebar-slim";
import { Tooltip } from "@repo/ui/untitledui/base/tooltip/tooltip";
import { CommandMenu } from "@repo/ui/untitledui/application/command-menus/command-menu";
import { PinnedWalletsSidebar } from "@/components/wallets/PinnedWalletsSidebar";

const footerItems: NavItemType[] = [
    {
        label: "Settings",
        href: "/settings",
        icon: Settings01,
    },
];

const commandRoutes: Record<string, string> = {
    home: "/",
    overview: "/overview",
    "credit-cards": "/credit-cards",
    transactions: "/transactions",
    wallets: "/wallets",
    settings: "/settings",
    "new-chat": "/",
};

export function DashboardSidebar() {
    const [isSlim, setIsSlim] = useState(false);
    const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("sidebar-slim");
        if (saved === "true") setIsSlim(true);
    }, []);

    const toggleSidebar = () => {
        const newState = !isSlim;
        setIsSlim(newState);
        localStorage.setItem("sidebar-slim", String(newState));
    };
    const router = useRouter();
    const pathname = usePathname();

    const threadsResult = useQuery(api.agent.threads.listForUser, {}) as
        | Array<{ threadId: string; title?: string; summary?: string; updatedAt: number }>
        | undefined;
    const threads = threadsResult ?? [];

    const historyItems: NavItemType["items"] = threads.map((thread) => ({
        label: thread.title ?? "Untitled",
        href: `/${thread.threadId}`,
    }));

    const navItemsSimple: NavItemType[] = [
        {
            label: "Home",
            href: "/",
            icon: Home03,
        },
        {
            label: "Overview",
            href: "/overview",
            icon: BarChartSquare02,
        },
        {
            label: "History",
            href: "/",
            icon: ClockRewind,
            ...(historyItems.length > 0 && { items: historyItems }),
        },
        {
            label: "Credit Cards",
            href: "/credit-cards",
            icon: CreditCard01,
        },
        {
            label: "Transactions",
            href: "/transactions",
            icon: Receipt,
        },
        {
            label: "Wallets",
            href: "/wallets",
            icon: Wallet01,
        },
    ];

    const handleSelectionChange = (keys: Selection) => {
        if (keys === "all") return;
        const selectedKey = Array.from(keys)[0] as string;
        if (!selectedKey) return;
        if (selectedKey.startsWith("thread:")) {
            const threadId = selectedKey.slice("thread:".length);
            router.push(`/${threadId}`);
            setIsCommandMenuOpen(false);
            return;
        }
        if (commandRoutes[selectedKey]) {
            router.push(commandRoutes[selectedKey]);
            setIsCommandMenuOpen(false);
        }
    };

    const searchItem: NavItemType = {
        label: "Search",
        icon: SearchLg,
        onClick: () => setIsCommandMenuOpen(true),
    };

    const finalFooterItems = footerItems;
    const slimItems = [searchItem, ...navItemsSimple];

    return (
        <>
            <div className="hidden lg:flex fixed inset-y-0 left-0 z-50">
                <motion.div
                    initial={false}
                    animate={{ width: isSlim ? "auto" : 296 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="h-full bg-primary overflow-hidden border-r border-secondary"
                >
                    <div className={isSlim ? "w-auto h-full min-w-[68px]" : "w-[296px] h-full min-w-[296px]"}>
                        {isSlim ? (
                             <SidebarSlimDesktop
                                activeUrl={pathname}
                                items={slimItems as any}
                                footerItems={finalFooterItems as any}
                                hideBorder
                             />
                        ) : (
                             <SidebarSimpleDesktop
                                activeUrl={pathname}
                                items={navItemsSimple}
                                footerItems={finalFooterItems}
                                onSearchClick={() => setIsCommandMenuOpen(true)}
                                hideBorder
                             >
                                <PinnedWalletsSidebar />
                             </SidebarSimpleDesktop>
                        )}
                    </div>
                </motion.div>

                {/* Toggle Strip */}
                <Tooltip
                    title={isSlim ? "Expand sidebar" : "Collapse sidebar"}
                    placement="right"
                    delay={0}
                    closeDelay={0}
                >
                    <button
                        type="button"
                        onClick={toggleSidebar}
                        className="group flex h-full w-2 cursor-col-resize flex-col justify-center hover:bg-secondary/50 active:bg-secondary"
                        aria-label={isSlim ? "Expand sidebar" : "Collapse sidebar"}
                    />
                </Tooltip>
            </div>

            {/* Mobile Sidebar */}
            <div className="lg:hidden">
                 {isSlim ? (
                    <SidebarNavigationSlim
                        activeUrl={pathname}
                        items={slimItems as any}
                        footerItems={finalFooterItems as any}
                    />
                ) : (
                    <SidebarNavigationSimple
                        activeUrl={pathname}
                        items={navItemsSimple}
                        footerItems={finalFooterItems}
                        onSearchClick={() => setIsCommandMenuOpen(true)}
                    >
                        <PinnedWalletsSidebar />
                    </SidebarNavigationSimple>
                )}
            </div>

            {/* Placeholder to take up physical space on desktop because the real sidebar has `fixed` position. */}
            <motion.div
                initial={false}
                animate={{ paddingLeft: isSlim ? 68 : 296 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="invisible hidden lg:sticky lg:top-0 lg:bottom-0 lg:left-0 lg:block flex-shrink-0"
            />
            <CommandMenu
                shortcut="⌘K"
                placeholder="Search..."
                isOpen={isCommandMenuOpen}
                onOpenChange={setIsCommandMenuOpen}
                onSelectionChange={handleSelectionChange}
            >
                <CommandMenu.List>
                    <CommandMenu.Section title="Navigation">
                        <CommandMenu.Item id="home" label="Home" type="icon" icon={Home03} />
                        <CommandMenu.Item id="overview" label="Overview" type="icon" icon={BarChartSquare02} />
                        <CommandMenu.Item id="credit-cards" label="Credit Cards" type="icon" icon={CreditCard01} />
                        <CommandMenu.Item id="transactions" label="Transactions" type="icon" icon={Receipt} />
                        <CommandMenu.Item id="wallets" label="Wallets" type="icon" icon={Wallet01} />
                    </CommandMenu.Section>
                    <CommandMenu.Section title="Threads">
                        <CommandMenu.Item id="new-chat" label="New chat" type="icon" icon={MessageSquare02} />
                        {threads.slice(0, 10).map((thread) => (
                            <CommandMenu.Item
                                key={thread.threadId}
                                id={`thread:${thread.threadId}`}
                                label={thread.title ?? "Untitled"}
                                type="icon"
                                icon={ClockRewind}
                            />
                        ))}
                    </CommandMenu.Section>
                    <CommandMenu.Section title="Settings">
                        <CommandMenu.Item id="settings" label="Settings" type="icon" icon={Settings01} shortcutKeys={["⌘", ","]} />
                    </CommandMenu.Section>
                </CommandMenu.List>
            </CommandMenu>
        </>
    );
}
