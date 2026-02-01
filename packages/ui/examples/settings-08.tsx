"use client";

import { Fragment } from "react";
import { BarChartSquare02, Calendar, CheckDone01, ChevronRight, File05, PieChart03, Rows01, Users01 } from "@untitledui/icons";
import { SidebarNavigationSectionsSubheadings } from "@repo/ui/untitledui/application/app-navigation/sidebar-navigation/sidebar-sections-subheadings";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { SectionLabel } from "@repo/ui/untitledui/application/section-headers/section-label";
import { Table, TableCard, TableRowActionsDropdown } from "@repo/ui/untitledui/application/table/table";
import { Avatar } from "@repo/ui/untitledui/base/avatar/avatar";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { Button } from "@repo/ui/untitledui/base/buttons/button";

const teams = [
    {
        title: "Catalog",
        subtitle: "catalogapp.io",
        src: "https://www.untitledui.com/logos/images/Catalog.jpg",
    },
    {
        title: "Warpspeed",
        subtitle: "getwarpspeed.com",
        src: "https://www.untitledui.com/logos/images/Warpspeed.jpg",
    },
    {
        title: "Boltshift",
        subtitle: "boltshiftdev.com",
        src: "https://www.untitledui.com/logos/images/Boltshift.jpg",
    },
    {
        title: "Sisyphus",
        subtitle: "sisyphus.com",
        src: "https://www.untitledui.com/logos/images/Sisyphus.jpg",
    },
];

const teamMembers = [
    {
        name: "Olivia Rhye",
        email: "olivia@untitledui.com",
        avatarUrl: "https://www.untitledui.com/images/avatars/olivia-rhye?fm=webp&q=80",
    },
    {
        name: "Phoenix Baker",
        email: "phoenix@untitledui.com",
        avatarUrl: "https://www.untitledui.com/images/avatars/phoenix-baker?fm=webp&q=80",
    },
    {
        name: "Lana Steiner",
        email: "lana@untitledui.com",
        avatarUrl: "https://www.untitledui.com/images/avatars/lana-steiner?fm=webp&q=80",
    },
    {
        name: "Demi Wilkinson",
        email: "demi@untitledui.com",
        avatarUrl: "https://www.untitledui.com/images/avatars/demi-wilkinson?fm=webp&q=80",
    },
    {
        name: "Candice Wu",
        email: "candice@untitledui.com",
    },
];

export const Settings08 = () => {
    const getInitials = (name: string) => {
        const [firstName, lastName] = name.split(" ");
        return `${firstName.charAt(0)}${lastName.charAt(0)}`;
    };

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSectionsSubheadings
                activeUrl="/team-management"
                items={[
                    {
                        label: "General",
                        items: [
                            {
                                label: "Dashboard",
                                href: "/",
                                icon: BarChartSquare02,
                            },
                            {
                                label: "Projects",
                                href: "/projects",
                                icon: Rows01,
                            },
                            {
                                label: "Documents",
                                href: "/documents",
                                icon: File05,
                            },
                            {
                                label: "Calendar",
                                href: "/calendar",
                                icon: Calendar,
                            },
                        ],
                    },
                    {
                        label: "Untitled UI",
                        items: [
                            {
                                label: "Reporting",
                                href: "#",
                                icon: PieChart03,
                            },
                            {
                                label: "Tasks",
                                href: "#",
                                icon: CheckDone01,
                                badge: (
                                    <Badge size="sm" type="modern">
                                        8
                                    </Badge>
                                ),
                            },
                            {
                                label: "Team management",
                                href: "/team-management",
                                icon: Users01,
                            },
                        ],
                    },
                    {
                        label: "Your teams",
                        items: [
                            {
                                label: "Catalog",
                                href: "#",
                                icon: () => <Avatar src="https://www.untitledui.com/logos/images/Catalog.jpg" className="mr-2 size-5" />,
                                badge: (
                                    <div className="flex items-center gap-3">
                                        <Badge size="sm" type="modern">
                                            ⌘1
                                        </Badge>
                                        <ChevronRight size={16} className="text-fg-quaternary" />
                                    </div>
                                ),
                            },
                            {
                                label: "Warpspeed",
                                href: "#",
                                icon: () => <Avatar src="https://www.untitledui.com/logos/images/Warpspeed.jpg" className="mr-2 size-5" />,
                                badge: (
                                    <div className="flex items-center gap-3">
                                        <Badge size="sm" type="modern">
                                            ⌘2
                                        </Badge>
                                        <ChevronRight size={16} className="text-fg-quaternary" />
                                    </div>
                                ),
                            },
                            {
                                label: "Boltshift",
                                href: "#",
                                icon: () => <Avatar src="https://www.untitledui.com/logos/images/Boltshift.jpg" className="mr-2 size-5" />,
                                badge: (
                                    <div className="flex items-center gap-3">
                                        <Badge size="sm" type="modern">
                                            ⌘3
                                        </Badge>
                                        <ChevronRight size={16} className="text-fg-quaternary" />
                                    </div>
                                ),
                            },
                            {
                                label: "Sisyphus",
                                href: "#",
                                icon: () => <Avatar src="https://www.untitledui.com/logos/images/Sisyphus.jpg" className="mr-2 size-5" />,
                                badge: (
                                    <div className="flex items-center gap-3">
                                        <Badge size="sm" type="modern">
                                            ⌘4
                                        </Badge>
                                        <ChevronRight size={16} className="text-fg-quaternary" />
                                    </div>
                                ),
                            },
                        ],
                    },
                ]}
            />

            <main className="min-w-0 flex-1 bg-primary pt-8 pb-12">
                <div className="flex flex-col gap-8">
                    <div className="px-4 lg:px-8">
                        {/* Page header simple */}
                        <div className="relative flex flex-col gap-5 border-b border-secondary pb-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                                <div className="flex flex-col gap-0.5 lg:gap-1">
                                    <h1 className="text-xl font-semibold text-primary lg:text-display-xs">Team management</h1>
                                    <p className="text-md text-tertiary">Manage your teams and user permissions.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-8 px-4 lg:gap-6 lg:px-8">
                        <SectionHeader.Root>
                            <SectionHeader.Group>
                                <div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                                    <SectionHeader.Heading>Teams</SectionHeader.Heading>
                                    <SectionHeader.Subheading>You're on the following teams. You can create a new team here.</SectionHeader.Subheading>
                                </div>
                                <SectionHeader.Actions>
                                    <Button color="secondary" size="md">
                                        Create new team
                                    </Button>
                                    <Button color="primary" size="md">
                                        Add team member
                                    </Button>
                                </SectionHeader.Actions>

                                <div className="absolute top-0 right-0 md:static">
                                    <TableRowActionsDropdown />
                                </div>
                            </SectionHeader.Group>
                        </SectionHeader.Root>

                        <div className="flex flex-col gap-8 lg:gap-5">
                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                                <SectionLabel.Root size="sm" title="On teams" description="You're currently on these teams." />

                                <ul className="flex flex-col gap-4 border-y border-secondary py-3 lg:border-none">
                                    {teams.map((team) => (
                                        <Fragment key={team.title}>
                                            <li className="flex items-center justify-between">
                                                <div className="group flex items-center gap-2">
                                                    <Avatar src={team.src} alt={team.title} />
                                                    <div>
                                                        <p className="text-sm font-semibold text-primary">{team.title}</p>
                                                        <p className="text-sm text-tertiary">{team.subtitle}</p>
                                                    </div>
                                                </div>

                                                <Button size="sm" color="link-gray">
                                                    Leave
                                                </Button>
                                            </li>
                                            <li aria-hidden="true" className="last:hidden">
                                                <hr className="h-px w-full border-none bg-border-secondary" />
                                            </li>
                                        </Fragment>
                                    ))}
                                </ul>
                            </div>

                            <hr className="hidden h-px w-full border-none bg-border-secondary lg:block" />

                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                                <SectionLabel.Root size="sm" title="Your team" description="Manage your existing team and change roles/permissions." />

                                <TableCard.Root className="-mx-4 rounded-none lg:mx-0 lg:rounded-xl">
                                    <Table aria-label="Your team" selectionMode="none">
                                        <Table.Header>
                                            <Table.Head id="name" label="Name" isRowHeader className="w-full" />
                                            <Table.Head id="email" label="Email" />
                                            <Table.Head id="actions" />
                                        </Table.Header>

                                        <Table.Body items={teamMembers}>
                                            {(member) => (
                                                <Table.Row id={member.email}>
                                                    <Table.Cell>
                                                        <div className="flex w-max items-center gap-3">
                                                            <Avatar src={member.avatarUrl} alt={member.name} size="md" initials={getInitials(member.name)} />
                                                            <p className="text-sm font-medium whitespace-nowrap text-primary lg:whitespace-normal">
                                                                {member.name}
                                                            </p>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell>{member.email}</Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex gap-3">
                                                            <Button size="sm" color="link-gray">
                                                                Delete
                                                            </Button>
                                                            <Button size="sm" color="link-color">
                                                                Edit
                                                            </Button>
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
