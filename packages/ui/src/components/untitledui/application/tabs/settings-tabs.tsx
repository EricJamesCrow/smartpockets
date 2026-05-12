"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cx } from "../../../../utils/cx";
import { NativeSelect } from "../../base/select/select-native";

const tabs = [
    { id: "profile", label: "Profile", href: "/settings" },
    { id: "password", label: "Password", href: "/settings/password" },
    { id: "appearance", label: "Appearance", href: "/settings/appearance" },
    { id: "billing", label: "Billing", href: "/settings/billing" },
    { id: "email", label: "Email", href: "/settings/email" },
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
            {/* Page header */}
            <div className="relative flex flex-col gap-5">
                <div className="flex flex-col gap-0.5 lg:gap-1">
                    <div className="flex flex-col gap-0.5 lg:gap-1">
                        <h1 className="text-primary lg:text-display-xs text-xl font-semibold">Settings</h1>
                    </div>
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
            <div className="scrollbar-hide -mx-4 -my-1 flex overflow-auto px-4 py-1 lg:-mx-8 lg:px-8">
                <nav className="hidden md:flex xl:w-full">
                    <div className="bg-secondary_alt ring-secondary flex gap-0.5 rounded-lg ring-1 ring-inset">
                        {tabs.map((tab) => {
                            const active = isActive(tab.href);
                            return (
                                <Link
                                    key={tab.id}
                                    href={tab.href}
                                    className={cx(
                                        "text-quaternary z-10 flex h-max cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition duration-100 ease-linear",
                                        "hover:text-secondary",
                                        "outline-focus-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
                                        active && "bg-primary_alt text-secondary shadow-xs ring-primary ring-1 ring-inset",
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
