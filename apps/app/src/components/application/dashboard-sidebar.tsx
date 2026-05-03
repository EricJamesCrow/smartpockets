"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { Selection } from "react-aria-components";
import { useConvexAuth } from "convex/react";
import {
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
import { ChatHistoryGroup } from "@/components/chat/sidebar/ChatHistoryGroup";
import { ChatHistoryItem } from "@/components/chat/sidebar/ChatHistoryItem";
import { PinnedWalletsSidebar } from "@/components/wallets/PinnedWalletsSidebar";

type ThreadSummary = {
    threadId: string;
    title?: string;
    summary?: string;
    updatedAt: number;
};

function bucketByRecency(threads: ThreadSummary[]) {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();
    const yesterdayMs = todayMs - day;
    const buckets: { label: string; threads: ThreadSummary[] }[] = [
        { label: "Today", threads: [] },
        { label: "Yesterday", threads: [] },
        { label: "Last 7 days", threads: [] },
        { label: "Last 30 days", threads: [] },
        { label: "Older", threads: [] },
    ];
    for (const t of threads) {
        if (t.updatedAt >= todayMs) buckets[0]!.threads.push(t);
        else if (t.updatedAt >= yesterdayMs) buckets[1]!.threads.push(t);
        else if (t.updatedAt >= now - 7 * day) buckets[2]!.threads.push(t);
        else if (t.updatedAt >= now - 30 * day) buckets[3]!.threads.push(t);
        else buckets[4]!.threads.push(t);
    }
    return buckets.filter((b) => b.threads.length > 0);
}

const footerItems: NavItemType[] = [
    {
        label: "Settings",
        href: "/settings",
        icon: Settings01,
    },
];

const commandRoutes: Record<string, string> = {
    home: "/",
    "credit-cards": "/credit-cards",
    transactions: "/transactions",
    wallets: "/wallets",
    settings: "/settings",
    "new-chat": "/",
};

export function DashboardSidebar() {
    const [isSlim, setIsSlim] = useState(false);
    const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
    // NOTE: kebab-menu open state lives inside each ChatHistoryItem instance,
    // not lifted to here. This component renders two ChatHistoryItem trees
    // per thread (desktop + mobile, gated by responsive `hidden`/`lg:hidden`),
    // and React Aria portals the popover to body — a single shared open flag
    // would render two visible popovers (CROWDEV-352).

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
    const params = useParams<{ threadId?: string }>();
    const activeThreadId = params?.threadId ?? null;
    const { isAuthenticated } = useConvexAuth();

    // Skip the threads query until Convex auth is ready — calling it
    // unauthenticated raises "Authentication required" and blanks the route.
    const threadsResult = useQuery(api.agent.threads.listForUser, isAuthenticated ? {} : "skip") as
        | ThreadSummary[]
        | undefined;
    const threads = threadsResult ?? [];

    const buckets = useMemo(() => bucketByRecency(threads), [threads]);

    const navItemsSimple: NavItemType[] = [
        {
            label: "Home",
            href: "/",
            icon: Home03,
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
                    className="relative h-full overflow-hidden border-r bg-primary border-secondary dark:border-[var(--sp-moss-line)]"
                >
                    {/* Soft mossy aurora wash anchors the sidebar in dark mode */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 hidden dark:block"
                        style={{
                            backgroundImage:
                                "radial-gradient(circle at 22% 6%, rgba(127,184,154,0.06), transparent 38%), radial-gradient(circle at 80% 92%, rgba(212,197,156,0.04), transparent 34%)",
                        }}
                    />
                    <div className={isSlim ? "relative w-auto h-full min-w-[68px]" : "relative w-[296px] h-full min-w-[296px]"}>
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
                                {buckets.length > 0 && (
                                    <nav
                                        aria-label="Chat history"
                                        className="flex flex-col gap-3 px-2 pt-2 lg:px-4"
                                    >
                                        {buckets.map((bucket) => (
                                            <ChatHistoryGroup key={bucket.label} label={bucket.label}>
                                                {bucket.threads.map((thread) => (
                                                    <ChatHistoryItem
                                                        key={thread.threadId}
                                                        threadId={thread.threadId}
                                                        title={thread.title ?? "Untitled"}
                                                        summary={thread.summary}
                                                        isActive={thread.threadId === activeThreadId}
                                                    />
                                                ))}
                                            </ChatHistoryGroup>
                                        ))}
                                    </nav>
                                )}
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
                        {buckets.length > 0 && (
                            <nav
                                aria-label="Chat history"
                                className="flex flex-col gap-3 px-2 pt-2 lg:px-4"
                            >
                                {buckets.map((bucket) => (
                                    <ChatHistoryGroup key={bucket.label} label={bucket.label}>
                                        {bucket.threads.map((thread) => (
                                            <ChatHistoryItem
                                                key={thread.threadId}
                                                threadId={thread.threadId}
                                                title={thread.title ?? "Untitled"}
                                                summary={thread.summary}
                                                isActive={thread.threadId === activeThreadId}
                                            />
                                        ))}
                                    </ChatHistoryGroup>
                                ))}
                            </nav>
                        )}
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
