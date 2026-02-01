"use client";

import { useMemo, useState } from "react";
import {
    BarChartSquare02,
    CheckCircle,
    CheckDone01,
    DownloadCloud02,
    Edit01,
    HomeLine,
    LayoutAlt01,
    MessageChatCircle,
    PieChart03,
    Plus,
    Rows01,
    Settings01 as Settings01Icon,
    Trash01,
    Users01,
} from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { FeaturedCardOnboardingSteps } from "@repo/ui/untitledui/application/app-navigation/base-components/featured-cards";
import { SidebarNavigationSimple } from "@repo/ui/untitledui/application/app-navigation/sidebar-navigation/sidebar-simple";
import { PaginationCardDefault } from "@repo/ui/untitledui/application/pagination/pagination";
import { Table, TableCard } from "@repo/ui/untitledui/application/table/table";
import { TabList, Tabs } from "@repo/ui/untitledui/application/tabs/tabs";
import { Avatar } from "@repo/ui/untitledui/base/avatar/avatar";
import type { BadgeColors } from "@repo/ui/untitledui/base/badges/badge-types";
import { Badge, BadgeWithDot } from "@repo/ui/untitledui/base/badges/badges";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { ButtonUtility } from "@repo/ui/untitledui/base/buttons/button-utility";
import { NativeSelect } from "@repo/ui/untitledui/base/select/select-native";

const tabs = [
    { id: "details", label: "My details" },
    { id: "profile", label: "Profile" },
    { id: "password", label: "Password" },
    { id: "team", label: "Team", badge: 48 },
    { id: "plan", label: "Plan" },
    { id: "billing", label: "Billing" },
    { id: "email", label: "Email" },
    { id: "notifications", label: "Notifications", badge: 2 },
    { id: "integrations", label: "Integrations" },
    { id: "api", label: "API" },
];

const teamMembers = [
    {
        name: "Olivia Rhye",
        email: "olivia@untitledui.com",
        username: "@olivia",
        avatarUrl: "https://www.untitledui.com/images/avatars/olivia-rhye?fm=webp&q=80",
        status: "Active",
        teams: [
            { name: "Design", value: "design" },
            { name: "Product", value: "product" },
        ],
    },
    {
        name: "Phoenix Baker",
        email: "phoenix@untitledui.com",
        username: "@phoenix",
        avatarUrl: "https://www.untitledui.com/images/avatars/phoenix-baker?fm=webp&q=80",
        status: "Active",
        teams: [
            { name: "Product", value: "product" },
            { name: "Software Engineering", value: "software_engineering" },
        ],
    },
    {
        name: "Lana Steiner",
        email: "lana@untitledui.com",
        username: "@lana",
        avatarUrl: "https://www.untitledui.com/images/avatars/lana-steiner?fm=webp&q=80",
        status: "Offline",
        teams: [
            { name: "Operations", value: "operations" },
            { name: "Product", value: "product" },
        ],
    },
    {
        name: "Demi Wilkinson",
        email: "demi@untitledui.com",
        username: "@demi",
        avatarUrl: "https://www.untitledui.com/images/avatars/demi-wilkinson?fm=webp&q=80",
        status: "Active",
        teams: [
            { name: "Design", value: "design" },
            { name: "Product", value: "product" },
            { name: "Software Engineering", value: "software_engineering" },
        ],
    },
    {
        name: "Candice Wu",
        email: "candice@untitledui.com",
        username: "@candice",
        status: "Offline",
        teams: [
            { name: "Operations", value: "operations" },
            { name: "Finance", value: "finance" },
        ],
    },
    {
        name: "Natali Craig",
        email: "natali@untitledui.com",
        username: "@natali",
        avatarUrl: "https://www.untitledui.com/images/avatars/natali-craig?fm=webp&q=80",
        status: "Active",
        teams: [
            { name: "Design", value: "design" },
            { name: "Finance", value: "finance" },
        ],
    },
    {
        name: "Drew Cano",
        email: "drew@untitledui.com",
        username: "@drew",
        avatarUrl: "https://www.untitledui.com/images/avatars/drew-cano?fm=webp&q=80",
        status: "Active",
        teams: [
            { name: "Customer Success", value: "customer_success" },
            { name: "Operations", value: "operations" },
            { name: "Finance", value: "finance" },
        ],
    },
    {
        name: "Orlando Diggs",
        email: "orlando@untitledui.com",
        username: "@orlando",
        avatarUrl: "https://www.untitledui.com/images/avatars/orlando-diggs?fm=webp&q=80",
        status: "Active",
        teams: [
            { name: "Product", value: "product" },
            { name: "Software Engineering", value: "software_engineering" },
        ],
    },
];

export const Settings10 = () => {
    const [selectedTab, setSelectedTab] = useState<string>("team");
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "status",
        direction: "ascending",
    });

    const teamsToBadgeColorsMap: Record<string, BadgeColors> = {
        design: "brand",
        product: "blue",
        software_engineering: "success",
        operations: "pink",
        finance: "purple",
        customer_success: "indigo",
    };

    const getInitials = (name: string) => {
        const [firstName, lastName] = name.split(" ");
        return `${firstName.charAt(0)}${lastName.charAt(0)}`;
    };

    const sortedItems = useMemo(() => {
        if (!sortDescriptor) return teamMembers;

        return teamMembers.toSorted((a, b) => {
            const first = a[sortDescriptor.column as keyof typeof a];
            const second = b[sortDescriptor.column as keyof typeof b];

            // Compare numbers or booleans
            if ((typeof first === "number" && typeof second === "number") || (typeof first === "boolean" && typeof second === "boolean")) {
                return sortDescriptor.direction === "descending" ? second - first : first - second;
            }

            // Compare strings
            if (typeof first === "string" && typeof second === "string") {
                const result = first.localeCompare(second);
                return sortDescriptor.direction === "ascending" ? result : -result;
            }

            return 0;
        });
    }, [sortDescriptor]);

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSimple
                activeUrl="/settings"
                items={[
                    {
                        label: "Home",
                        href: "/",
                        icon: HomeLine,
                        items: [
                            { label: "Overview", href: "/overview" },
                            { label: "Products", href: "/products" },
                            { label: "Orders", href: "/orders" },
                            { label: "Customers", href: "/customers" },
                        ],
                    },
                    {
                        label: "Dashboard",
                        href: "/dashboard",
                        icon: BarChartSquare02,
                        items: [
                            { label: "Overview", href: "/dashboard/overview" },
                            { label: "Notifications", href: "/dashboard/notifications", badge: 10 },
                            { label: "Analytics", href: "/dashboard/analytics" },
                            { label: "Saved reports", href: "/dashboard/saved-reports" },
                        ],
                    },
                    {
                        label: "Projects",
                        href: "/projects",
                        icon: Rows01,
                        items: [
                            { label: "View all", href: "/projects/all" },
                            { label: "Personal", href: "/projects/personal" },
                            { label: "Team", href: "/projects/team" },
                            { label: "Shared with me", href: "/projects/shared-with-me" },
                            { label: "Archive", href: "/projects/archive" },
                        ],
                    },
                    {
                        label: "Tasks",
                        href: "/tasks",
                        icon: CheckDone01,
                        badge: 8,
                        items: [
                            { label: "My tasks", href: "/tasks/my-tasks" },
                            { label: "Assigned to me", href: "/tasks/assigned" },
                            { label: "Completed", href: "/tasks/completed" },
                            { label: "Upcoming", href: "/tasks/upcoming" },
                        ],
                    },
                    {
                        label: "Reporting",
                        href: "/reporting",
                        icon: PieChart03,
                        items: [
                            { label: "Dashboard", href: "/reporting/dashboard" },
                            { label: "Revenue", href: "/reporting/revenue" },
                            { label: "Performance", href: "/reporting/performance" },
                            { label: "Export data", href: "/reporting/export" },
                        ],
                    },
                    {
                        label: "Users",
                        href: "/users",
                        icon: Users01,
                        items: [
                            { label: "All users", href: "/users/all" },
                            { label: "Admins", href: "/users/admins" },
                            { label: "Team members", href: "/users/team" },
                            { label: "Permissions", href: "/users/permissions" },
                        ],
                    },
                ]}
                footerItems={[
                    {
                        label: "Settings",
                        href: "/settings",
                        icon: Settings01Icon,
                    },
                    {
                        label: "Support",
                        href: "/support",
                        icon: MessageChatCircle,
                        badge: (
                            <BadgeWithDot size="sm" color="success" type="modern">
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
                featureCard={
                    <FeaturedCardOnboardingSteps
                        title="Complete account"
                        supportingText="Step 3 of 4"
                        progress={75}
                        description={
                            <ul className="flex flex-col gap-2">
                                <li className="flex gap-2 pr-2">
                                    <CheckCircle size={20} className="text-fg-brand-primary" />
                                    <span className="text-sm font-medium text-tertiary">Complete your profile</span>
                                </li>
                                <li className="flex gap-2 pr-2">
                                    <CheckCircle size={20} className="text-fg-brand-primary" />
                                    <span className="text-sm font-medium text-tertiary">Verify your phone number</span>
                                </li>
                                <li className="flex gap-2 pr-2">
                                    <CheckCircle size={20} className="text-fg-brand-primary" />
                                    <span className="text-sm font-medium text-tertiary">Set up 2FA and backup email</span>
                                </li>
                                <li className="flex gap-2 pr-2">
                                    <CheckCircle size={20} className="text-fg-quaternary" />
                                    <span className="text-sm font-medium text-tertiary">Add payout bank details</span>
                                </li>
                            </ul>
                        }
                        confirmLabel="Continue setup"
                        onConfirm={() => {}}
                        onDismiss={() => {}}
                    />
                }
            />

            <main className="min-w-0 flex-1 bg-primary pt-8 pb-12">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-5 px-4 lg:px-8">
                        {/* Page header simple  */}
                        <div className="relative flex flex-col gap-5">
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
                            <Tabs className="hidden md:flex xl:w-full" selectedKey={selectedTab} onSelectionChange={(value) => setSelectedTab(value as string)}>
                                <TabList type="button-gray" className="w-full" items={tabs} />
                            </Tabs>
                        </div>
                    </div>

                    <div className="border-t border-secondary lg:border-none lg:px-8">
                        <TableCard.Root className="rounded-none bg-transparent shadow-none ring-0 lg:rounded-xl lg:bg-primary lg:shadow-xs lg:ring-1">
                            <TableCard.Header
                                title="Team members"
                                description="Manage your team members and their account permissions here."
                                className="pb-5"
                                badge={
                                    <Badge color="gray" type="modern" size="sm">
                                        48 users
                                    </Badge>
                                }
                                contentTrailing={
                                    <div className="flex gap-3">
                                        <Button color="secondary" size="md" iconLeading={DownloadCloud02}>
                                            Download CSV
                                        </Button>
                                        <Button size="md" iconLeading={Plus}>
                                            Add user
                                        </Button>
                                    </div>
                                }
                            />
                            <Table
                                aria-label="Team members"
                                selectionMode="multiple"
                                sortDescriptor={sortDescriptor}
                                onSortChange={setSortDescriptor}
                                className="bg-primary"
                            >
                                <Table.Header className="bg-primary">
                                    <Table.Head id="name" isRowHeader label="Name" allowsSorting className="w-full" />
                                    <Table.Head id="status" label="Status" allowsSorting />
                                    <Table.Head id="email" label="Email address" allowsSorting />
                                    <Table.Head id="teams" label="Teams" allowsSorting />
                                    <Table.Head id="actions" />
                                </Table.Header>
                                <Table.Body items={sortedItems}>
                                    {(member) => (
                                        <Table.Row id={member.email} className="odd:bg-secondary_subtle">
                                            <Table.Cell>
                                                <div className="flex w-max items-center gap-3">
                                                    <Avatar src={member.avatarUrl} initials={getInitials(member.name)} alt={member.name} />
                                                    <div>
                                                        <p className="text-sm font-medium text-primary">{member.name}</p>
                                                        <p className="text-sm text-tertiary">{member.username}</p>
                                                    </div>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <BadgeWithDot
                                                    color={member.status === "Active" ? "success" : member.status === "Offline" ? "gray" : "gray"}
                                                    size="sm"
                                                    type="modern"
                                                >
                                                    {member.status}
                                                </BadgeWithDot>
                                            </Table.Cell>
                                            <Table.Cell>{member.email}</Table.Cell>
                                            <Table.Cell>
                                                <div className="flex gap-1">
                                                    {member.teams.map((team) => (
                                                        <BadgeWithDot key={team.value} color={teamsToBadgeColorsMap[team.value]} type="modern" size="sm">
                                                            {team.name}
                                                        </BadgeWithDot>
                                                    ))}
                                                </div>
                                            </Table.Cell>

                                            <Table.Cell className="px-4">
                                                <div className="flex justify-end gap-0.5">
                                                    <ButtonUtility size="xs" color="tertiary" tooltip="Delete" icon={Trash01} />
                                                    <ButtonUtility size="xs" color="tertiary" tooltip="Edit" icon={Edit01} />
                                                </div>
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table>
                            <PaginationCardDefault page={1} total={6} />
                        </TableCard.Root>
                    </div>
                </div>
            </main>
        </div>
    );
};
