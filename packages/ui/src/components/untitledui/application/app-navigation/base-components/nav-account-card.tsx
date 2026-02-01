"use client";

import type { FC, HTMLAttributes } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Placement } from "@react-types/overlays";
import { useClerk, useOrganization, useOrganizationList, useUser } from "@clerk/nextjs";
import { BookOpen01, ChevronSelectorVertical, LogOut01, Plus, Settings01, User01 } from "@untitledui/icons";
import { useFocusManager } from "react-aria";
import type { DialogProps as AriaDialogProps } from "react-aria-components";
import { Button as AriaButton, Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { toast } from "sonner";
import { IconNotification } from "../../notifications/notifications";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "../../modals/modal";
import { Avatar } from "../../../base/avatar/avatar";
import { AvatarLabelGroup } from "../../../base/avatar/avatar-label-group";
import { Button } from "../../../base/buttons/button";
import { HintText } from "../../../base/input/hint-text";
import { InputBase, TextField } from "../../../base/input/input";
import { Label } from "../../../base/input/label";
import { RadioButtonBase } from "../../../base/radio-buttons/radio-buttons";
import { useBreakpoint } from "../../../../../hooks/use-breakpoint";
import { cx } from "../../../../../utils/cx";

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
}

export const NavAccountMenu = ({
    className,
    onCreateOrgClick,
    onClose,
    ...dialogProps
}: AriaDialogProps & {
    className?: string;
    onCreateOrgClick?: () => void;
    onClose?: () => void;
}) => {
    const router = useRouter();
    const { user } = useUser();
    const { organization: activeOrg } = useOrganization();
    const { userMemberships, setActive, isLoaded } = useOrganizationList({
        userMemberships: { infinite: true },
    });
    const { signOut } = useClerk();

    const focusManager = useFocusManager();
    const dialogRef = useRef<HTMLDivElement>(null);

    const onKeyDown = useCallback(
        (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowDown":
                    focusManager?.focusNext({ tabbable: true, wrap: true });
                    break;
                case "ArrowUp":
                    focusManager?.focusPrevious({ tabbable: true, wrap: true });
                    break;
            }
        },
        [focusManager],
    );

    useEffect(() => {
        const element = dialogRef.current;
        if (element) {
            element.addEventListener("keydown", onKeyDown);
        }

        return () => {
            if (element) {
                element.removeEventListener("keydown", onKeyDown);
            }
        };
    }, [onKeyDown]);

    const handleSwitchOrg = async (orgId: string) => {
        try {
            await setActive?.({ organization: orgId });
            onClose?.();
            toast.custom((t) => (
                <IconNotification
                    title="Organization switched"
                    description="You are now viewing a different organization."
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } catch {
            toast.custom((t) => (
                <IconNotification
                    title="Error"
                    description="Failed to switch organization"
                    color="error"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        }
    };

    const handleSignOut = async () => {
        await signOut({ redirectUrl: "/" });
    };

    const organizations = userMemberships?.data ?? [];

    return (
        <AriaDialog
            {...dialogProps}
            ref={dialogRef}
            className={cx("w-72 rounded-xl bg-secondary_alt shadow-lg ring ring-secondary_alt outline-hidden", className)}
        >
            <div className="rounded-xl bg-primary ring-1 ring-secondary">
                {/* User info section */}
                {user && (
                    <div className="border-b border-secondary px-3 py-3">
                        <AvatarLabelGroup
                            size="md"
                            src={user.imageUrl}
                            title={user.fullName ?? "User"}
                            subtitle={user.primaryEmailAddress?.emailAddress}
                            status="online"
                        />
                    </div>
                )}

                {/* Menu actions */}
                <div className="flex flex-col gap-0.5 py-1.5">
                    <NavAccountCardMenuItem label="View profile" icon={User01} shortcut="⌘K->P" />
                    <NavAccountCardMenuItem label="Account settings" icon={Settings01} shortcut="⌘S" />
                    <NavAccountCardMenuItem label="Documentation" icon={BookOpen01} />
                </div>

                {/* Organization switcher */}
                <div className="flex flex-col gap-0.5 border-t border-secondary py-1.5">
                    <div className="px-3 pt-1.5 pb-1 text-xs font-semibold text-tertiary">Switch organization</div>

                    {!isLoaded ? (
                        <div className="px-3 py-2 text-sm text-tertiary">Loading...</div>
                    ) : organizations.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-tertiary">No organizations yet</div>
                    ) : (
                        <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto px-1.5">
                            {organizations.map((membership) => {
                                const org = membership.organization;
                                const isActive = org.id === activeOrg?.id;

                                return (
                                    <button
                                        key={org.id}
                                        onClick={() => !isActive && handleSwitchOrg(org.id)}
                                        className={cx(
                                            "relative w-full cursor-pointer rounded-md px-2 py-1.5 text-left outline-focus-ring hover:bg-primary_hover focus:z-10 focus-visible:outline-2 focus-visible:outline-offset-2",
                                            isActive && "bg-primary_hover",
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar
                                                size="sm"
                                                src={org.imageUrl}
                                                alt={org.name}
                                                initials={org.name.slice(0, 2).toUpperCase()}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-primary">{org.name}</p>
                                                <p className="truncate text-xs text-tertiary">{membership.role}</p>
                                            </div>
                                        </div>

                                        <RadioButtonBase isSelected={isActive} className="absolute top-1/2 right-2 -translate-y-1/2" />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Create organization button */}
                <div className="flex flex-col gap-2 px-2 pt-0.5 pb-2">
                    <Button
                        iconLeading={Plus}
                        color="secondary"
                        size="sm"
                        onClick={() => {
                            onClose?.();
                            if (onCreateOrgClick) {
                                onCreateOrgClick();
                            } else {
                                router.push("/settings/team");
                            }
                        }}
                    >
                        Create organization
                    </Button>
                </div>
            </div>

            {/* Sign out */}
            <div className="pt-1 pb-1.5">
                <NavAccountCardMenuItem label="Sign out" icon={LogOut01} shortcut="⌥⇧Q" onClick={handleSignOut} />
            </div>
        </AriaDialog>
    );
};

const NavAccountCardMenuItem = ({
    icon: Icon,
    label,
    shortcut,
    ...buttonProps
}: {
    icon?: FC<{ className?: string }>;
    label: string;
    shortcut?: string;
} & HTMLAttributes<HTMLButtonElement>) => {
    return (
        <button {...buttonProps} className={cx("group/item w-full cursor-pointer px-1.5 focus:outline-hidden", buttonProps.className)}>
            <div
                className={cx(
                    "flex w-full items-center justify-between gap-3 rounded-md p-2 group-hover/item:bg-primary_hover",
                    // Focus styles.
                    "outline-focus-ring group-focus-visible/item:outline-2 group-focus-visible/item:outline-offset-2",
                )}
            >
                <div className="flex gap-2 text-sm font-semibold text-secondary group-hover/item:text-secondary_hover">
                    {Icon && <Icon className="size-5 text-fg-quaternary" />} {label}
                </div>

                {shortcut && (
                    <kbd className="flex rounded px-1 py-px font-body text-xs font-medium text-tertiary ring-1 ring-secondary ring-inset">{shortcut}</kbd>
                )}
            </div>
        </button>
    );
};

export const NavAccountCard = ({
    popoverPlacement,
}: {
    popoverPlacement?: Placement;
}) => {
    const triggerRef = useRef<HTMLDivElement>(null);
    const isDesktop = useBreakpoint("lg");
    const { user, isLoaded: isUserLoaded } = useUser();
    const { organization: activeOrg } = useOrganization();
    const { createOrganization } = useOrganizationList({
        userMemberships: { infinite: true },
    });

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgSlug, setNewOrgSlug] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const handleCreateOrg = async () => {
        if (!newOrgName.trim()) return;

        setIsCreating(true);
        setCreateError(null);

        try {
            await createOrganization?.({
                name: newOrgName.trim(),
                slug: newOrgSlug.trim() || slugify(newOrgName),
            });

            toast.custom((t) => (
                <IconNotification
                    title="Organization created"
                    description={`${newOrgName} has been created successfully.`}
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));

            setIsCreateModalOpen(false);
            setNewOrgName("");
            setNewOrgSlug("");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create organization";
            if (message.includes("slug")) {
                setCreateError("Organization slug already taken");
            } else {
                setCreateError(message);
            }
        } finally {
            setIsCreating(false);
        }
    };

    if (!isUserLoaded || !user) {
        return (
            <div className="relative flex items-center gap-3 rounded-xl p-3 ring-1 ring-secondary ring-inset">
                <div className="h-10 w-10 animate-pulse rounded-full bg-secondary" />
                <div className="flex flex-1 flex-col gap-1">
                    <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-32 animate-pulse rounded bg-secondary" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div ref={triggerRef} className="relative flex items-center gap-3 rounded-xl p-3 ring-1 ring-secondary ring-inset">
                <AvatarLabelGroup
                    size="md"
                    src={user.imageUrl}
                    title={user.fullName ?? "User"}
                    subtitle={activeOrg?.name ?? user.primaryEmailAddress?.emailAddress}
                    status="online"
                />

                <div className="absolute top-1.5 right-1.5">
                    <AriaDialogTrigger isOpen={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                        <AriaButton className="flex cursor-pointer items-center justify-center rounded-md p-1.5 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2 pressed:bg-primary_hover pressed:text-fg-quaternary_hover">
                            <ChevronSelectorVertical className="size-4 shrink-0" />
                        </AriaButton>
                        <AriaPopover
                            placement={popoverPlacement ?? (isDesktop ? "right bottom" : "top right")}
                            triggerRef={triggerRef}
                            offset={8}
                            className={({ isEntering, isExiting }) =>
                                cx(
                                    "origin-(--trigger-anchor-point) will-change-transform",
                                    isEntering &&
                                        "duration-150 ease-out animate-in fade-in placement-right:slide-in-from-left-0.5 placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5",
                                    isExiting &&
                                        "duration-100 ease-in animate-out fade-out placement-right:slide-out-to-left-0.5 placement-top:slide-out-to-bottom-0.5 placement-bottom:slide-out-to-top-0.5",
                                )
                            }
                        >
                            <NavAccountMenu
                                onCreateOrgClick={() => setIsCreateModalOpen(true)}
                                onClose={() => setIsPopoverOpen(false)}
                            />
                        </AriaPopover>
                    </AriaDialogTrigger>
                </div>
            </div>

            {/* Create Organization Modal */}
            <DialogTrigger isOpen={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <ModalOverlay>
                    <Modal>
                        <Dialog>
                            {({ close }) => (
                                <div className="flex w-full max-w-md flex-col gap-6 rounded-xl bg-primary p-6 shadow-xl">
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-lg font-semibold text-primary">Create organization</h2>
                                        <p className="text-sm text-tertiary">
                                            Create a new organization to collaborate with your team.
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <TextField
                                            aria-label="Organization name"
                                            isRequired
                                            value={newOrgName}
                                            onChange={setNewOrgName}
                                        >
                                            <Label>Organization name</Label>
                                            <InputBase
                                                size="md"
                                                placeholder="Acme Inc"
                                            />
                                        </TextField>

                                        <TextField
                                            aria-label="Organization slug"
                                            value={newOrgSlug}
                                            onChange={setNewOrgSlug}
                                            isInvalid={!!createError}
                                        >
                                            <Label>Slug (URL identifier)</Label>
                                            <InputBase
                                                size="md"
                                                placeholder={slugify(newOrgName) || "acme-inc"}
                                            />
                                            <HintText>
                                                {createError || "Leave blank to auto-generate from name"}
                                            </HintText>
                                        </TextField>
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <Button
                                            color="secondary"
                                            size="md"
                                            onClick={() => {
                                                close();
                                                setNewOrgName("");
                                                setNewOrgSlug("");
                                                setCreateError(null);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            color="primary"
                                            size="md"
                                            onClick={handleCreateOrg}
                                            isLoading={isCreating}
                                            isDisabled={!newOrgName.trim()}
                                        >
                                            Create organization
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Dialog>
                    </Modal>
                </ModalOverlay>
            </DialogTrigger>
        </>
    );
};
