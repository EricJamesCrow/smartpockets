"use client";

import {
    ArrowLeft,
    BarChartSquare02,
    CheckDone01,
    CreditCard01,
    Edit01,
    Flag05,
    HomeLine,
    LifeBuoy01,
    NotificationBox,
    Passcode,
    PieChart03,
    Plus,
    Rows01,
    Settings01 as Settings01Icon,
    Toggle01Right,
    Trash01,
    UserSquare,
    Users01,
} from "@untitledui/icons";
import { SidebarNavigationSlim } from "@repo/ui/untitledui/application/app-navigation/sidebar-navigation/sidebar-slim";
import { Breadcrumbs } from "@repo/ui/untitledui/application/breadcrumbs/breadcrumbs";
import { SectionLabel } from "@repo/ui/untitledui/application/section-headers/section-label";
import { Table, TableCard } from "@repo/ui/untitledui/application/table/table";
import { Avatar } from "@repo/ui/untitledui/base/avatar/avatar";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { ButtonUtility } from "@repo/ui/untitledui/base/buttons/button-utility";

const formatDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

const teamMembers = [
    {
        name: "Olivia Rhye",
        email: "olivia@untitledui.com",
        avatarUrl: "https://www.untitledui.com/images/avatars/olivia-rhye?fm=webp&q=80",
        dateAdded: new Date(2025, 1, 22).getTime(),
        lastActive: new Date(2025, 2, 14).getTime(),
    },
    {
        name: "Phoenix Baker",
        email: "phoenix@untitledui.com",
        avatarUrl: "https://www.untitledui.com/images/avatars/phoenix-baker?fm=webp&q=80",
        dateAdded: new Date(2025, 1, 22).getTime(),
        lastActive: new Date(2025, 2, 12).getTime(),
    },
    {
        name: "Lana Steiner",
        email: "lana@untitledui.com",
        avatarUrl: "https://www.untitledui.com/images/avatars/lana-steiner?fm=webp&q=80",
        dateAdded: new Date(2025, 1, 22).getTime(),
        lastActive: new Date(2025, 2, 12).getTime(),
    },
    {
        name: "Demi Wilkinson",
        email: "demi@untitledui.com",
        avatarUrl: "https://www.untitledui.com/images/avatars/demi-wilkinson?fm=webp&q=80",
        dateAdded: new Date(2025, 1, 22).getTime(),
        lastActive: new Date(2025, 2, 14).getTime(),
    },
    {
        name: "Candice Wu",
        email: "candice@untitledui.com",
        dateAdded: new Date(2025, 1, 22).getTime(),
        lastActive: new Date(2025, 2, 13).getTime(),
    },
];

const users = [
    {
        name: "Natali Craig",
        email: "natali@untitledui.com",
        avatarUrl: "https://www.untitledui.com/images/avatars/natali-craig?fm=webp&q=80",
        dateAdded: new Date(2025, 1, 22).getTime(),
        lastActive: new Date(2025, 2, 14).getTime(),
    },
    {
        name: "Drew Cano",
        email: "drew@untitledui.com",
        avatarUrl: "https://www.untitledui.com/images/avatars/drew-cano?fm=webp&q=80",
        dateAdded: new Date(2025, 1, 22).getTime(),
        lastActive: new Date(2025, 2, 12).getTime(),
    },
    {
        name: "Orlando Diggs",
        email: "orlando@untitledui.com",
        avatarUrl: "https://www.untitledui.com/images/avatars/orlando-diggs?fm=webp&q=80",
        dateAdded: new Date(2025, 1, 22).getTime(),
        lastActive: new Date(2025, 2, 12).getTime(),
    },
    {
        name: "Andi Lane",
        email: "andi@untitledui.com",
        avatarUrl: "https://www.untitledui.com/images/avatars/andi-lane?fm=webp&q=80",
        dateAdded: new Date(2025, 1, 22).getTime(),
        lastActive: new Date(2025, 2, 14).getTime(),
    },
    {
        name: "Kate Morrison",
        email: "kate@untitledui.com",
        avatarUrl: "https://www.untitledui.com/images/avatars/kate-morrison?fm=webp&q=80",
        dateAdded: new Date(2025, 1, 22).getTime(),
        lastActive: new Date(2025, 2, 14).getTime(),
    },
];

export const Settings09 = () => {
    const getInitials = (name: string) => {
        const [firstName, lastName] = name.split(" ");
        return `${firstName.charAt(0)}${lastName.charAt(0)}`;
    };

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/settings/profile"
                items={[
                    {
                        label: "Home",
                        href: "/",
                        icon: HomeLine,
                    },
                    {
                        label: "Dashboard",
                        href: "/dashboard",
                        icon: BarChartSquare02,
                    },
                    {
                        label: "Projects",
                        href: "/projects",
                        icon: Rows01,
                    },
                    {
                        label: "Tasks",
                        href: "/tasks",
                        icon: CheckDone01,
                    },
                    {
                        label: "Reporting",
                        href: "/reporting",
                        icon: PieChart03,
                    },
                    {
                        label: "Users",
                        href: "/users",
                        icon: Users01,
                    },
                ]}
                footerItems={[
                    {
                        label: "Support",
                        href: "/support",
                        icon: LifeBuoy01,
                    },
                    {
                        label: "Settings",
                        href: "/settings",
                        icon: Settings01Icon,
                        items: [
                            { label: "My details", href: "/settings/details", icon: Flag05 },
                            { label: "Profile", href: "/settings/profile", icon: UserSquare, badge: 10 },
                            { label: "Password", href: "/settings/password", icon: Passcode },
                            { label: "Billing", href: "/settings/billing", icon: CreditCard01 },
                            { label: "Notifications", href: "/settings/notifications", icon: NotificationBox },
                            { label: "Integrations", href: "/settings/integrations", icon: Toggle01Right },
                        ],
                    },
                ]}
            />

            <main className="min-w-0 flex-1 bg-primary pt-8 pb-12">
                <div className="flex flex-col gap-8">
                    <div className="px-4 lg:px-8">
                        {/* Page header simple */}
                        <div className="relative flex flex-col gap-4 border-b border-secondary pb-4">
                            <div className="max-lg:hidden">
                                <Breadcrumbs type="button">
                                    <Breadcrumbs.Item href="#" icon={HomeLine} />
                                    <Breadcrumbs.Item href="#">Settings</Breadcrumbs.Item>
                                    <Breadcrumbs.Item href="#">Team</Breadcrumbs.Item>
                                </Breadcrumbs>
                            </div>
                            <div className="flex lg:hidden">
                                <Button href="#" color="link-gray" size="md" iconLeading={ArrowLeft}>
                                    Back
                                </Button>
                            </div>
                            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                                <div className="flex flex-col gap-0.5 lg:gap-1">
                                    <h1 className="text-xl font-semibold text-primary lg:text-display-xs">Team members</h1>
                                    <p className="text-md text-tertiary">Manage your team members and their account permissions here.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Button color="secondary" size="md" iconLeading={Plus}>
                                        Add team member
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-4 lg:px-8">
                        <div className="flex flex-col gap-8 lg:gap-5">
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                                <SectionLabel.Root
                                    size="sm"
                                    title="Admin users"
                                    description="Admins can add and remove users and manage organization-level settings."
                                />

                                <TableCard.Root className="-mx-4 rounded-none lg:mx-0 lg:rounded-xl">
                                    <Table aria-label="Admin users" selectionMode="multiple">
                                        <Table.Header>
                                            <Table.Head id="name" label="Name" isRowHeader className="w-full" />
                                            <Table.Head id="dateAdded" label="Date added" className="min-w-34" />
                                            <Table.Head id="lastActive" label="Last active" className="min-w-34" />
                                            <Table.Head id="actions" />
                                        </Table.Header>

                                        <Table.Body items={teamMembers}>
                                            {(member) => (
                                                <Table.Row id={member.email} className="even:bg-secondary_subtle">
                                                    <Table.Cell>
                                                        <div className="flex w-max items-center gap-3">
                                                            <Avatar src={member.avatarUrl} initials={getInitials(member.name)} alt={member.name} />
                                                            <div>
                                                                <p className="text-sm font-medium text-primary">{member.name}</p>
                                                                <p className="text-sm text-tertiary">{member.email}</p>
                                                            </div>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>{formatDate(member.dateAdded)}</Table.Cell>
                                                    <Table.Cell>{formatDate(member.lastActive)}</Table.Cell>
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
                                </TableCard.Root>
                            </div>

                            <hr className="hidden h-px w-full border-none bg-border-secondary lg:block" />

                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                                <SectionLabel.Root
                                    size="sm"
                                    title="Account users"
                                    description="Account users can assess and review risks, questionnaires, data leaks and identify breaches."
                                />

                                <TableCard.Root className="-mx-4 rounded-none lg:mx-0 lg:rounded-xl">
                                    <Table aria-label="Account users" selectionMode="multiple">
                                        <Table.Header>
                                            <Table.Head id="name" label="Name" isRowHeader className="w-full" />
                                            <Table.Head id="dateAdded" label="Date added" className="min-w-34" />
                                            <Table.Head id="lastActive" label="Last active" className="min-w-34" />
                                            <Table.Head id="actions" />
                                        </Table.Header>

                                        <Table.Body items={users}>
                                            {(user) => (
                                                <Table.Row id={user.email} className="even:bg-secondary_subtle">
                                                    <Table.Cell>
                                                        <div className="flex w-max items-center gap-3">
                                                            <Avatar src={user.avatarUrl} initials={getInitials(user.name)} alt={user.name} />
                                                            <div>
                                                                <p className="text-sm font-medium text-primary">{user.name}</p>
                                                                <p className="text-sm text-tertiary">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>{formatDate(user.dateAdded)}</Table.Cell>
                                                    <Table.Cell>{formatDate(user.lastActive)}</Table.Cell>
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
                                </TableCard.Root>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
