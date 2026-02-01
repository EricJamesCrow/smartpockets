"use client";

import { Fragment, useState } from "react";
import {
    BarChartSquare02,
    CheckDone01,
    HomeLine,
    LayoutAlt01,
    MessageChatCircle,
    Monitor04,
    PieChart03,
    Rows01,
    Settings01 as Settings01Icon,
    UserPlus01,
    Users01,
} from "@untitledui/icons";
import { FeaturedCardMessage } from "@repo/ui/untitledui/application/app-navigation/base-components/featured-cards";
import { SidebarNavigationSimple } from "@repo/ui/untitledui/application/app-navigation/sidebar-navigation/sidebar-simple";
import { SectionFooter } from "@repo/ui/untitledui/application/section-footers/section-footer";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { SectionLabel } from "@repo/ui/untitledui/application/section-headers/section-label";
import { TableRowActionsDropdown } from "@repo/ui/untitledui/application/table/table";
import { TabList, Tabs } from "@repo/ui/untitledui/application/tabs/tabs";
import { AvatarProfilePhoto } from "@repo/ui/untitledui/base/avatar/avatar-profile-photo";
import { BadgeWithDot } from "@repo/ui/untitledui/base/badges/badges";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { HintText } from "@repo/ui/untitledui/base/input/hint-text";
import { InputBase, TextField } from "@repo/ui/untitledui/base/input/input";
import { Label } from "@repo/ui/untitledui/base/input/label";
import { NativeSelect } from "@repo/ui/untitledui/base/select/select-native";

const tabs = [
    { id: "details", label: "My details" },
    { id: "profile", label: "Profile" },
    { id: "password", label: "Password" },
    { id: "team", label: "Team", badge: 4 },
    { id: "plan", label: "Plan" },
    { id: "billing", label: "Billing" },
    { id: "email", label: "Email" },
    { id: "notifications", label: "Notifications", badge: 2 },
    { id: "integrations", label: "Integrations" },
    { id: "api", label: "API" },
];

const sessions = [
    {
        icon: Monitor04,
        deviceName: "2025 MacBook Pro 14-inch",
        location: "Melbourne, Australia",
        date: "22 Jan at 10:40am",
        active: true,
    },
    {
        icon: Monitor04,
        deviceName: "2025 MacBook Pro 14-inch",
        location: "Melbourne, Australia",
        date: "22 Jan at 4:20pm",
    },
];

export const Settings05 = () => {
    const [selectedTab, setSelectedTab] = useState<string>("password");

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
                    <FeaturedCardMessage
                        title="Mathilde Lewis"
                        supportingText="2 mins ago"
                        description="I've finished adding my notes. Happy for us to review whenever you're ready!"
                        confirmLabel="Reply"
                        onConfirm={() => {}}
                        onDismiss={() => {}}
                    />
                }
            />

            <main className="min-w-0 flex-1 bg-primary pb-12">
                <div className="flex flex-col gap-8 lg:gap-12">
                    {/* Page header banner avatar */}
                    <div className="relative flex flex-col">
                        <div className="px-1 lg:pt-1">
                            <div className="h-40 w-full rounded-xl bg-linear-to-t from-[#FBC5EC] to-[#A5C0EE] lg:h-60" />
                        </div>

                        <div className="mx-auto -mt-12 w-full max-w-(--breakpoint-xl) px-4 lg:-mt-10 lg:px-8">
                            <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
                                <div className="flex justify-between">
                                    <AvatarProfilePhoto
                                        verified
                                        className="lg:hidden"
                                        size="md"
                                        src="https://www.untitledui.com/images/avatars/olivia-rhye?fm=webp&q=80"
                                        alt="Olivia Rhye"
                                    />
                                    <AvatarProfilePhoto
                                        verified
                                        className="hidden lg:flex"
                                        size="lg"
                                        src="https://www.untitledui.com/images/avatars/olivia-rhye?fm=webp&q=80"
                                        alt="Olivia Rhye"
                                    />
                                </div>

                                <div className="flex w-full flex-col gap-5 lg:pt-16">
                                    <div className="flex flex-col justify-between gap-4 lg:flex-row">
                                        <div className="flex flex-col gap-0.5 lg:gap-1">
                                            <h1 className="text-xl font-semibold text-primary lg:text-display-xs">Olivia Rhye</h1>
                                            <p className="text-md text-tertiary">olivia@untitledui.com</p>
                                        </div>
                                        <div className="flex flex-col gap-4 group-aria-pressed/field:inset-2 lg:flex-row">
                                            <div className="flex items-start gap-3">
                                                <Button color="secondary" size="md" iconLeading={UserPlus01}>
                                                    Share
                                                </Button>
                                                <Button size="md">View profile</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 px-4 lg:px-8">
                        <NativeSelect
                            aria-label="Page tabs"
                            className="md:hidden"
                            value={selectedTab}
                            onChange={(event) => setSelectedTab(event.target.value)}
                            options={tabs.map((tab) => ({ label: tab.label, value: tab.id }))}
                        />

                        <div className="-mx-4 -my-1 scrollbar-hide flex overflow-auto px-4 py-1 lg:-mx-8 lg:px-8">
                            <Tabs className="hidden md:flex xl:w-full" selectedKey={selectedTab} onSelectionChange={(value) => setSelectedTab(value as string)}>
                                <TabList type="underline" className="w-full" items={tabs} />
                            </Tabs>
                        </div>

                        <SectionHeader.Root>
                            <SectionHeader.Group>
                                <div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                                    <SectionHeader.Heading>Password</SectionHeader.Heading>
                                    <SectionHeader.Subheading>Please enter your current password to change your password.</SectionHeader.Subheading>
                                </div>
                            </SectionHeader.Group>
                        </SectionHeader.Root>

                        <Form
                            className="contents"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const data = Object.fromEntries(new FormData(e.currentTarget));
                                console.log("Form data:", data);
                            }}
                        >
                            <div className="flex flex-col gap-5">
                                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                                    <SectionLabel.Root isRequired size="sm" title="Current password" className="max-lg:hidden" />

                                    <TextField aria-label="Current password" isRequired name="currentPassword" type="password" autoComplete="current-password">
                                        <Label className="lg:hidden">Current password</Label>
                                        <InputBase size="md" placeholder="••••••••" />
                                    </TextField>
                                </div>

                                <hr className="h-px w-full border-none bg-border-secondary" />

                                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                                    <SectionLabel.Root isRequired size="sm" title="New password" className="max-lg:hidden" />

                                    <TextField aria-label="New password" isRequired name="newPassword" type="password" autoComplete="new-password">
                                        <Label className="lg:hidden">New password</Label>
                                        <InputBase size="md" placeholder="••••••••" />
                                        <HintText>
                                            <span className="max-lg:hidden">Your new password must be more than 8 characters.</span>
                                            <span className="lg:hidden">Must be more than 8 characters.</span>
                                        </HintText>
                                    </TextField>
                                </div>

                                <hr className="h-px w-full border-none bg-border-secondary" />

                                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                                    <SectionLabel.Root isRequired size="sm" title="Confirm new password" className="max-lg:hidden" />

                                    <TextField aria-label="Confirm new password" isRequired name="confirmPassword" type="password" autoComplete="new-password">
                                        <Label className="lg:hidden">Confirm new password</Label>
                                        <InputBase size="md" placeholder="••••••••" />
                                    </TextField>
                                </div>
                            </div>
                            <SectionFooter.Root>
                                <SectionFooter.Actions>
                                    <Button color="secondary" size="md">
                                        Cancel
                                    </Button>
                                    <Button type="submit" color="primary" size="md">
                                        Update password
                                    </Button>
                                </SectionFooter.Actions>
                            </SectionFooter.Root>
                        </Form>
                    </div>

                    <div className="flex flex-col gap-6 px-4 lg:px-8">
                        <SectionHeader.Root>
                            <SectionHeader.Group>
                                <div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                                    <SectionHeader.Heading>Where you're logged in</SectionHeader.Heading>
                                    <SectionHeader.Subheading>
                                        We'll alert you via <span className="font-semibold">olivia@untitledui.com</span> if there is any unusual activity on
                                        your account.
                                    </SectionHeader.Subheading>
                                </div>

                                <div className="absolute top-0 right-0 md:static">
                                    <TableRowActionsDropdown />
                                </div>
                            </SectionHeader.Group>
                        </SectionHeader.Root>

                        <div className="flex flex-col gap-5">
                            {sessions.map((session, index) => (
                                <Fragment key={index}>
                                    <div className="flex gap-4 lg:pl-4">
                                        <session.icon className="size-6 text-fg-quaternary" />

                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-secondary">{session.deviceName}</p>
                                                {session.active && (
                                                    <BadgeWithDot color="success" type="modern" size="sm">
                                                        Active now
                                                    </BadgeWithDot>
                                                )}
                                            </div>
                                            <p className="text-sm text-tertiary">
                                                {session.location} • {session.date}
                                            </p>
                                        </div>
                                    </div>

                                    <hr className="h-px w-full border-none bg-border-secondary" />
                                </Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
