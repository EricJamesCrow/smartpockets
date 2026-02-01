"use client";

import { useState, useMemo, type FC } from "react";
import { useRouter } from "next/navigation";
import {
    AtSign,
    Bell01,
    Building07,
    CreditCard01,
    Link01,
    Lock01,
    Mail01,
    Mail02,
    Palette,
    SearchLg,
    User01,
    Users01,
} from "@untitledui/icons";
import { Heading as AriaHeading, type Key } from "react-aria-components";
import { useHotkeys } from "react-hotkeys-hook";
import { CommandMenu } from "../command-menus/command-menu";
import { EmptyState } from "../empty-state/empty-state";
import { Button } from "../../base/buttons/button";
import { FeaturedIcon } from "../../foundations/featured-icon/featured-icon";
import { cx } from "../../../../utils/cx";

interface SettingsItem {
    id: string;
    label: string;
    description: string;
    icon: FC<{ className?: string }>;
    href: string;
    section: string;
}

const settingsItems: Record<string, SettingsItem[]> = {
    profile: [
        { id: "profile-edit", label: "Edit profile", description: "Update your personal details", icon: User01, href: "/settings", section: "profile" },
        { id: "profile-username", label: "Change username", description: "Update your username", icon: AtSign, href: "/settings", section: "profile" },
    ],
    password: [
        { id: "password-change", label: "Change password", description: "Update your password", icon: Lock01, href: "/settings/password", section: "password" },
    ],
    appearance: [
        { id: "appearance-theme", label: "Theme settings", description: "Light, dark, or system", icon: Palette, href: "/settings/appearance", section: "appearance" },
    ],
    team: [
        { id: "team-orgs", label: "Organizations", description: "Manage your organizations", icon: Building07, href: "/settings/team", section: "team" },
        { id: "team-members", label: "Team members", description: "View and manage members", icon: Users01, href: "/settings/team/members", section: "team" },
        { id: "team-invitations", label: "Invitations", description: "Invite new members", icon: Mail01, href: "/settings/team/invitations", section: "team" },
    ],
    billing: [
        { id: "billing-subscription", label: "Manage subscription", description: "View or change your plan", icon: CreditCard01, href: "/settings/billing", section: "billing" },
    ],
    email: [
        { id: "email-addresses", label: "Email addresses", description: "Manage your email addresses", icon: Mail02, href: "/settings/email", section: "email" },
    ],
    notifications: [
        { id: "notifications-settings", label: "Notification settings", description: "Email and push notifications", icon: Bell01, href: "/settings/notifications", section: "notifications" },
    ],
    integrations: [
        { id: "integrations-accounts", label: "Connected accounts", description: "Manage OAuth connections", icon: Link01, href: "/settings/integrations", section: "integrations" },
    ],
};

const sectionTitles: Record<string, string> = {
    profile: "Profile",
    password: "Password",
    appearance: "Appearance",
    team: "Team",
    billing: "Billing",
    email: "Email",
    notifications: "Notifications",
    integrations: "Integrations",
};

const sectionOrder = ["profile", "password", "appearance", "team", "billing", "email", "notifications", "integrations"];

function getOrderedSections(currentPath: string): string[] {
    const pathToSection: Record<string, string> = {
        "/settings": "profile",
        "/settings/password": "password",
        "/settings/appearance": "appearance",
        "/settings/team": "team",
        "/settings/billing": "billing",
        "/settings/email": "email",
        "/settings/notifications": "notifications",
        "/settings/integrations": "integrations",
    };

    // Find matching section
    let currentSection: string | undefined;
    for (const [path, section] of Object.entries(pathToSection)) {
        if (currentPath === path || currentPath.startsWith(path + "/")) {
            currentSection = section;
            break;
        }
    }

    if (currentSection) {
        return [currentSection, ...sectionOrder.filter((s) => s !== currentSection)];
    }

    return sectionOrder;
}

function getAllItems(): SettingsItem[] {
    return Object.values(settingsItems).flat();
}

function findItemById(id: Key): SettingsItem | undefined {
    return getAllItems().find((item) => item.id === id);
}

interface SettingsPreviewProps {
    selectedId: Key;
}

const SettingsPreview = ({ selectedId }: SettingsPreviewProps) => {
    const item = findItemById(selectedId);

    if (!item) return null;

    const sectionTitle = sectionTitles[item.section];

    return (
        <div className="relative hidden w-90 flex-col border-l border-secondary bg-secondary/50 px-5 py-6 sm:flex">
            <div className="mb-3">
                <FeaturedIcon icon={item.icon} size="lg" color="gray" theme="modern" />
            </div>
            <div className="flex flex-col gap-0.5">
                <p className="text-md font-semibold text-primary">{item.label}</p>
                <p className="text-sm text-tertiary">{item.description}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
                <Button size="md" className="w-full">
                    Go to {sectionTitle}
                </Button>
            </div>
        </div>
    );
};

interface SettingsCommandMenuProps {
    currentPath: string;
}

export function SettingsCommandMenu({ currentPath }: SettingsCommandMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    // Register hotkey for opening the menu
    useHotkeys("meta+,", (e) => {
        e.preventDefault();
        setIsOpen(true);
    });

    const orderedSections = useMemo(() => getOrderedSections(currentPath), [currentPath]);

    const groups = useMemo(() => {
        return orderedSections.map((sectionId) => ({
            id: sectionId,
            title: sectionTitles[sectionId],
            items: (settingsItems[sectionId] ?? []).map((item) => ({
                id: item.id,
                type: "icon" as const,
                label: item.label,
                icon: item.icon,
                description: item.description,
                size: "sm" as const,
                href: item.href,
            })),
        }));
    }, [orderedSections]);

    const handleSelectionChange = (keys: Set<Key>) => {
        const selectedId = Array.from(keys)[0];
        if (!selectedId) return;

        const item = findItemById(selectedId);
        if (item) {
            setIsOpen(false);
            router.push(item.href);
        }
    };

    // Get first item for default selection
    const firstItem = groups[0]?.items[0];

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={cx(
                    "flex h-9 w-full items-center gap-2 rounded-lg border border-primary bg-primary px-3 text-sm text-quaternary shadow-xs transition duration-100 ease-linear lg:w-80",
                    "hover:border-primary_hover hover:bg-primary_hover",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                )}
            >
                <SearchLg className="size-4 shrink-0" />
                <span className="flex-1 text-left">Search settings...</span>
                <kbd className="hidden rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-tertiary sm:inline-block">
                    ⌘,
                </kbd>
            </button>

            <CommandMenu
                isOpen={isOpen}
                items={groups}
                shortcut={null}
                defaultSelectedKeys={firstItem ? [firstItem.id] : undefined}
                onOpenChange={setIsOpen}
                onSelectionChange={(keys) => handleSelectionChange(keys as Set<Key>)}
                placeholder="Search settings..."
                emptyState={
                    <EmptyState size="sm" className="overflow-hidden p-6 pb-10">
                        <EmptyState.Header>
                            <EmptyState.FeaturedIcon color="gray" />
                        </EmptyState.Header>
                        <EmptyState.Content className="mb-0">
                            <EmptyState.Title>No settings found</EmptyState.Title>
                            <EmptyState.Description>
                                Your search did not match any settings. Please try again.
                            </EmptyState.Description>
                        </EmptyState.Content>
                    </EmptyState>
                }
            >
                <AriaHeading slot="title" className="sr-only">
                    Settings
                </AriaHeading>
                <CommandMenu.Group className="flex max-h-88.5">
                    <CommandMenu.List>
                        {(group) => (
                            <CommandMenu.Section {...group}>
                                {(item) => <CommandMenu.Item key={item.id} {...item} />}
                            </CommandMenu.Section>
                        )}
                    </CommandMenu.List>
                    <CommandMenu.Preview asChild>
                        {({ selectedId }) => <SettingsPreview selectedId={selectedId} />}
                    </CommandMenu.Preview>
                </CommandMenu.Group>
            </CommandMenu>
        </>
    );
}
