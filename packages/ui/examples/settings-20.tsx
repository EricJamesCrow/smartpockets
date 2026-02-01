"use client";

import { useState } from "react";
import {
    BarChartSquare02,
    Folder,
    HomeLine,
    LayoutAlt01,
    MessageChatCircle,
    PieChart03,
    Rows01,
    SearchLg,
    Settings01 as Settings01Icon,
} from "@untitledui/icons";
import { SidebarNavigationSectionDividers } from "@repo/ui/untitledui/application/app-navigation/sidebar-navigation/sidebar-section-dividers";
import { InlineCTAImage } from "@repo/ui/untitledui/application/inline-cta/inline-cta.demo";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { TabList, Tabs } from "@repo/ui/untitledui/application/tabs/tabs";
import { BadgeWithDot } from "@repo/ui/untitledui/base/badges/badges";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { NativeSelect } from "@repo/ui/untitledui/base/select/select-native";
import { Toggle } from "@repo/ui/untitledui/base/toggle/toggle";

const tabs = [
    { id: "details", label: "My details" },
    { id: "profile", label: "Profile" },
    { id: "password", label: "Password" },
    { id: "team", label: "Team" },
    { id: "plan", label: "Plan" },
    { id: "billing", label: "Billing" },
    { id: "email", label: "Email" },
    { id: "notifications", label: "Notifications", badge: 2 },
    { id: "integrations", label: "Integrations" },
    { id: "api", label: "API" },
];

const integrations = [
    {
        name: "Linear",
        description: "Streamline software projects, sprints, tasks, and bug tracking.",
        logo: "https://www.untitledui.com/logos/integrations/linear.svg",
        url: "https://linear.com",
        active: true,
    },
    {
        name: "GitHub",
        description: "Link pull requests and automate workflows.",
        logo: "https://www.untitledui.com/logos/integrations/github.svg",
        url: "https://github.com",
        active: true,
    },
    {
        name: "Figma",
        description: "Embed file previews in projects.",
        logo: "https://www.untitledui.com/logos/integrations/figma.svg",
        url: "https://figma.com",
        active: true,
    },
    {
        name: "Zapier",
        description: "Build custom automations and integrations with other apps.",
        logo: "https://www.untitledui.com/logos/integrations/zapier.svg",
        url: "https://zapier.com",
        active: true,
    },
    {
        name: "Notion",
        description: "Embed notion pages and notes in projects.",
        logo: "https://www.untitledui.com/logos/integrations/notion.svg",
        url: "https://notion.com",
        active: true,
    },
    {
        name: "Slack",
        description: "Send notifications to channels and create projects from messages.",
        logo: "https://www.untitledui.com/logos/integrations/slack.svg",
        url: "https://slack.com",
        active: false,
    },
];

export const Settings20 = () => {
    const [selectedTab, setSelectedTab] = useState<string>("integrations");

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSectionDividers
                activeUrl="/settings"
                items={[
                    {
                        label: "Home",
                        href: "#",
                        icon: HomeLine,
                    },
                    {
                        label: "Dashboard",
                        href: "/dashboard",
                        icon: BarChartSquare02,
                    },
                    {
                        label: "Projects",
                        href: "#",
                        icon: Rows01,
                    },
                    { divider: true },
                    {
                        label: "Folders",
                        icon: Folder,
                        items: [
                            { label: "View all", badge: 18, href: "#" },
                            { label: "Recent", badge: 8, href: "#" },
                            { label: "Favorites", badge: 6, href: "#" },
                            { label: "Shared", badge: 4, href: "#" },
                        ],
                    },
                    { divider: true },
                    {
                        label: "Reporting",
                        href: "#",
                        icon: PieChart03,
                    },
                    {
                        label: "Settings",
                        href: "/settings",
                        icon: Settings01Icon,
                    },
                    {
                        label: "Support",
                        href: "#",
                        icon: MessageChatCircle,
                        badge: (
                            <BadgeWithDot color="success" type="modern" size="sm">
                                Online
                            </BadgeWithDot>
                        ),
                    },
                    {
                        label: "Open in browser",
                        href: "https://www.untitledui.com/",
                        icon: LayoutAlt01,
                    },
                ]}
            />

            <main className="min-w-0 flex-1 bg-primary pt-8 pb-12">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-5 px-4 lg:px-8">
                        {/* Page header simple with search */}
                        <div className="relative flex flex-col gap-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                                <div className="flex flex-col gap-0.5 lg:gap-1">
                                    <h1 className="text-xl font-semibold text-primary lg:text-display-xs">Settings</h1>
                                </div>
                            </div>
                        </div>

                        <NativeSelect
                            aria-label="Page tabs"
                            className="md:hidden"
                            value={selectedTab}
                            onChange={(event) => setSelectedTab(event.target.value)}
                            options={tabs.map((tab) => ({ label: tab.label, value: tab.id }))}
                        />

                        <div className="-mx-4 -my-1 scrollbar-hide flex overflow-auto px-4 py-1 lg:-mx-8 lg:px-8">
                            <Tabs className="hidden w-full md:flex" selectedKey={selectedTab} onSelectionChange={(value) => setSelectedTab(value as string)}>
                                <TabList type="underline" className="w-full" items={tabs} />
                            </Tabs>
                        </div>
                    </div>

                    <div className="px-4 lg:px-8">
                        <InlineCTAImage />
                    </div>

                    <div className="flex flex-col gap-6 px-4 lg:px-8">
                        <SectionHeader.Root className="border-none pb-0">
                            <SectionHeader.Group>
                                <div className="flex flex-1 flex-col justify-center gap-0.5">
                                    <SectionHeader.Heading>Connected apps</SectionHeader.Heading>
                                    <SectionHeader.Subheading>Supercharge your workflow and connect the tool you use every day.</SectionHeader.Subheading>
                                </div>
                                <div className="w-full md:w-80">
                                    <Input size="sm" shortcut aria-label="Search" placeholder="Search" icon={SearchLg} />
                                </div>
                            </SectionHeader.Group>
                        </SectionHeader.Root>

                        <ul className="flex flex-col gap-4 lg:gap-0">
                            {integrations.map((integration) => (
                                <li
                                    key={integration.name}
                                    className="flex flex-col gap-4 border-b border-secondary py-4 last:border-none lg:flex-row lg:items-center"
                                >
                                    <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
                                        <div className="flex items-center justify-between">
                                            <div className="w-max shrink-0 rounded-lg bg-white p-0.5 shadow-xs ring-1 ring-secondary ring-inset">
                                                <img src={integration.logo} alt={`${integration.name} logo`} className="size-12 object-contain" />
                                            </div>
                                            <div className="lg:hidden">
                                                <Toggle isSelected={integration.active} size="md" />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <p className="text-md font-semibold text-secondary">{integration.name}</p>
                                            <p className="text-sm text-tertiary">{integration.description}</p>
                                        </div>
                                    </div>
                                    <div className="-mt-1 flex items-center gap-4 lg:mt-0">
                                        <Button color="link-gray" size="md" href={integration.url} target="_blank">
                                            Learn more
                                        </Button>
                                        <div className="max-lg:hidden">
                                            <Toggle isSelected={integration.active} size="md" />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
};
