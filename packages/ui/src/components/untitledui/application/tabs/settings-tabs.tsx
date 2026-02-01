"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SettingsCommandMenu } from "../command-menus/settings-command-menu";
import { NativeSelect } from "../../base/select/select-native";
import { cx } from "../../../../utils/cx";

const tabs = [
    { id: "profile", label: "Profile", href: "/settings" },
    { id: "password", label: "Password", href: "/settings/password" },
    { id: "appearance", label: "Appearance", href: "/settings/appearance" },
    { id: "team", label: "Team", href: "/settings/team" },
    { id: "billing", label: "Billing", href: "/settings/billing" },
    { id: "email", label: "Email", href: "/settings/email" },
    { id: "notifications", label: "Notifications", href: "/settings/notifications" },
    { id: "integrations", label: "Integrations", href: "/settings/integrations" },
    { id: "institutions", label: "Institutions", href: "/settings/institutions" },
];

export function SettingsTabs() {
    const pathname = usePathname();
    const router = useRouter();

    const isActive = (href: string) => {
        if (href === "/settings") {
            return pathname === "/settings";
        }
        return pathname.startsWith(href);
    };

    const currentTab = tabs.find((tab) => isActive(tab.href))?.id ?? "profile";

    return (
        <div className="flex flex-col gap-5 px-4 lg:px-8">
            {/* Page header with search */}
            <div className="relative flex flex-col gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                    <div className="flex flex-col gap-0.5 lg:gap-1">
                        <h1 className="text-xl font-semibold text-primary lg:text-display-xs">Settings</h1>
                    </div>
                    <SettingsCommandMenu currentPath={pathname} />
                </div>
            </div>

            {/* Mobile select */}
            <NativeSelect
                aria-label="Page tabs"
                className="md:hidden"
                value={currentTab}
                onChange={(event) => {
                    const tab = tabs.find((t) => t.id === event.target.value);
                    if (tab && !isActive(tab.href)) {
                        router.push(tab.href);
                    }
                }}
                options={tabs.map((tab) => ({ label: tab.label, value: tab.id }))}
            />

            {/* Desktop tabs */}
            <div className="-mx-4 -my-1 scrollbar-hide flex overflow-auto px-4 py-1 lg:-mx-8 lg:px-8">
                <nav className="hidden md:flex xl:w-full">
                    <div className="flex gap-0.5 rounded-lg bg-secondary_alt ring-1 ring-inset ring-secondary">
                        {tabs.map((tab) => {
                            const active = isActive(tab.href);
                            return (
                                <Link
                                    key={tab.id}
                                    href={tab.href}
                                    className={cx(
                                        "z-10 flex h-max cursor-pointer items-center justify-center gap-2 rounded-lg whitespace-nowrap text-sm font-semibold py-2 px-3 text-quaternary transition duration-100 ease-linear",
                                        "hover:text-secondary",
                                        "focus-visible:outline-2 focus-visible:-outline-offset-2 outline-focus-ring",
                                        active && "bg-primary_alt text-secondary shadow-xs ring-1 ring-primary ring-inset"
                                    )}
                                >
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>
        </div>
    );
}
