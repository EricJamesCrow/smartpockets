"use client";

import { Fragment, useState, useEffect } from "react";
import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { Plus } from "@untitledui/icons";
import { toast } from "sonner";
import { FileUpload } from "@repo/ui/untitledui/application/file-upload/file-upload-base";
import { IconNotification } from "@repo/ui/untitledui/application/notifications/notifications";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { SectionLabel } from "@repo/ui/untitledui/application/section-headers/section-label";
import { Avatar } from "@repo/ui/untitledui/base/avatar/avatar";
import { BadgeWithDot } from "@repo/ui/untitledui/base/badges/badges";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@repo/ui/untitledui/application/modals/modal";
import { InputBase, TextField } from "@repo/ui/untitledui/base/input/input";
import { Label } from "@repo/ui/untitledui/base/input/label";
import { HintText } from "@repo/ui/untitledui/base/input/hint-text";

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
}

export default function TeamPage() {
    const { organization: activeOrg, membership } = useOrganization();
    const { userMemberships, setActive, createOrganization, isLoaded } = useOrganizationList({
        userMemberships: { infinite: true },
    });

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgSlug, setNewOrgSlug] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Logo upload state
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isSavingLogo, setIsSavingLogo] = useState(false);

    useEffect(() => {
        if (activeOrg) {
            setAvatarPreview(activeOrg.imageUrl || null);
            setAvatarFile(null);
        }
    }, [activeOrg]);

    const handleAvatarUpload = (files: FileList | null) => {
        const file = files?.[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveLogo = async () => {
        if (!activeOrg || !avatarFile) return;

        setIsSavingLogo(true);
        try {
            await activeOrg.setLogo({ file: avatarFile });
            setAvatarFile(null);
            toast.custom((t) => (
                <IconNotification
                    title="Organization logo updated"
                    description="The organization logo has been successfully updated."
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update logo";
            toast.custom((t) => (
                <IconNotification
                    title="Error"
                    description={message}
                    color="error"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } finally {
            setIsSavingLogo(false);
        }
    };

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

    const handleSwitchOrg = async (orgId: string) => {
        try {
            await setActive?.({ organization: orgId });
            toast.custom((t) => (
                <IconNotification
                    title="Organization switched"
                    description="You are now viewing a different organization."
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } catch (error) {
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

    const handleLeaveOrg = async (membershipId: string, orgName: string) => {
        try {
            const membershipToLeave = userMemberships?.data?.find(
                (m) => m.id === membershipId
            );
            await membershipToLeave?.destroy();

            toast.custom((t) => (
                <IconNotification
                    title="Left organization"
                    description={`You have left ${orgName}.`}
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to leave organization";
            toast.custom((t) => (
                <IconNotification
                    title="Error"
                    description={message.includes("admin") ? "Cannot leave - you're the only admin" : message}
                    color="error"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        }
    };

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center py-16">
                <p className="text-tertiary">Loading organizations...</p>
            </div>
        );
    }

    const organizations = userMemberships?.data ?? [];
    const isAdmin = membership?.role === "org:admin";

    return (
        <>
            <SectionHeader.Root>
                <SectionHeader.Group>
                    <div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                        <SectionHeader.Heading>Organizations</SectionHeader.Heading>
                        <SectionHeader.Subheading>
                            Manage your organizations and switch between them.
                        </SectionHeader.Subheading>
                    </div>
                    <SectionHeader.Actions>
                        <Button
                            color="primary"
                            size="md"
                            iconLeading={Plus}
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            Create organization
                        </Button>
                    </SectionHeader.Actions>
                </SectionHeader.Group>
            </SectionHeader.Root>

            <div className="flex flex-col gap-8 lg:gap-5">
                {activeOrg && isAdmin && (
                    <>
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                            <SectionLabel.Root
                                size="sm"
                                title="Organization logo"
                                description="Update the logo for your active organization."
                            />
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-5 lg:flex-row">
                                    <Avatar size="2xl" src={avatarPreview || undefined} alt={activeOrg.name} initials={activeOrg.name.slice(0, 2).toUpperCase()} />
                                    <FileUpload.DropZone
                                        className="w-full"
                                        accept="image/*"
                                        allowsMultiple={false}
                                        onDropFiles={(files) => handleAvatarUpload(files)}
                                    />
                                </div>
                                {avatarFile && (
                                    <div className="flex justify-end">
                                        <Button
                                            color="primary"
                                            size="sm"
                                            onClick={handleSaveLogo}
                                            isLoading={isSavingLogo}
                                        >
                                            Save logo
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <hr className="h-px w-full border-none bg-border-secondary" />
                    </>
                )}

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                    <SectionLabel.Root
                        size="sm"
                        title="Your organizations"
                        description="Organizations you're a member of."
                    />

                    {organizations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-secondary bg-secondary_alt py-12">
                            <p className="text-sm text-tertiary">You're not a member of any organizations yet.</p>
                            <Button
                                color="secondary"
                                size="sm"
                                iconLeading={Plus}
                                onClick={() => setIsCreateModalOpen(true)}
                            >
                                Create your first organization
                            </Button>
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-4 border-y border-secondary py-3 lg:border-none">
                            {organizations.map((membership) => {
                                const org = membership.organization;
                                const isActive = org.id === activeOrg?.id;

                                return (
                                    <Fragment key={org.id}>
                                        <li className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    src={org.imageUrl}
                                                    alt={org.name}
                                                    initials={org.name.slice(0, 2).toUpperCase()}
                                                />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="truncate text-sm font-semibold text-primary">
                                                            {org.name}
                                                        </p>
                                                        {isActive && (
                                                            <BadgeWithDot color="success" type="modern" size="sm">
                                                                Active
                                                            </BadgeWithDot>
                                                        )}
                                                    </div>
                                                    <p className="truncate text-sm text-tertiary">{org.slug}</p>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2">
                                                {!isActive && (
                                                    <Button
                                                        size="sm"
                                                        color="secondary"
                                                        onClick={() => handleSwitchOrg(org.id)}
                                                    >
                                                        Switch
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    color="link-gray"
                                                    onClick={() => handleLeaveOrg(membership.id, org.name)}
                                                >
                                                    Leave
                                                </Button>
                                            </div>
                                        </li>
                                        <li aria-hidden="true" className="last:hidden">
                                            <hr className="h-px w-full border-none bg-border-secondary" />
                                        </li>
                                    </Fragment>
                                );
                            })}
                        </ul>
                    )}
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
}
