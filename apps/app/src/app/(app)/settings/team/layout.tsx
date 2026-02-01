"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NativeSelect } from "@repo/ui/untitledui/base/select/select-native";
import { cx } from "@repo/ui/utils";

const teamTabs = [
    { id: "general", label: "General", href: "/settings/team" },
    { id: "members", label: "Members", href: "/settings/team/members" },
    { id: "invitations", label: "Invitations", href: "/settings/team/invitations" },
];

export default function TeamLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const isActive = (href: string) => {
        if (href === "/settings/team") {
            return pathname === "/settings/team";
        }
        return pathname.startsWith(href);
    };

    const currentTab = teamTabs.find((tab) => isActive(tab.href))?.id ?? "general";

    return (
        <div className="flex flex-col gap-6 px-4 lg:px-8">
            {/* Mobile select */}
            <NativeSelect
                aria-label="Team tabs"
                className="md:hidden"
                value={currentTab}
                onChange={(event) => {
                    const tab = teamTabs.find((t) => t.id === event.target.value);
                    if (tab) {
                        router.push(tab.href);
                    }
                }}
                options={teamTabs.map((tab) => ({ label: tab.label, value: tab.id }))}
            />

            {/* Desktop tabs */}
            <div className="-mx-4 -my-1 scrollbar-hide hidden overflow-auto px-4 py-1 md:flex lg:-mx-8 lg:px-8">
                <nav className="flex border-b border-secondary">
                    {teamTabs.map((tab) => {
                        const active = isActive(tab.href);
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={cx(
                                    "relative flex h-max cursor-pointer items-center justify-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold text-tertiary transition duration-100 ease-linear",
                                    "hover:text-secondary",
                                    "focus-visible:outline-2 focus-visible:-outline-offset-2 outline-focus-ring",
                                    active && "text-brand-secondary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-solid"
                                )}
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {children}
        </div>
    );
}
