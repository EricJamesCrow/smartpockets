"use client";

import { useState } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { Edit05, Trash01, UserX01 } from "@untitledui/icons";
import { toast } from "sonner";
import { IconNotification } from "@repo/ui/untitledui/application/notifications/notifications";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { Table, TableCard } from "@repo/ui/untitledui/application/table/table";
import { Avatar } from "@repo/ui/untitledui/base/avatar/avatar";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Dropdown } from "@repo/ui/untitledui/base/dropdown/dropdown";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@repo/ui/untitledui/application/modals/modal";
import { NativeSelect } from "@repo/ui/untitledui/base/select/select-native";

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date);
}

function getInitials(name: string): string {
    const parts = name.split(" ");
    if (parts.length >= 2 && parts[0] && parts[1]) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

function getRoleBadgeColor(role: string): "brand" | "gray" {
    return role === "org:admin" ? "brand" : "gray";
}

type RoleBadgeColor = "brand" | "gray";

function getRoleLabel(role: string): string {
    switch (role) {
        case "org:admin":
            return "Admin";
        case "org:member":
            return "Member";
        default:
            return role.replace("org:", "").charAt(0).toUpperCase() + role.replace("org:", "").slice(1);
    }
}

export default function MembersPage() {
    const { user: currentUser } = useUser();
    const { organization, memberships, membership: currentMembership } = useOrganization({
        memberships: { pageSize: 50 },
    });

    const [selectedMember, setSelectedMember] = useState<{
        id: string;
        userId: string;
        name: string;
        role: string;
    } | null>(null);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
    const [newRole, setNewRole] = useState("org:member");
    const [isUpdating, setIsUpdating] = useState(false);

    const isAdmin = currentMembership?.role === "org:admin";

    const handleChangeRole = async () => {
        if (!selectedMember || !memberships?.data) return;

        setIsUpdating(true);
        try {
            const membershipToUpdate = memberships.data.find(
                (m) => m.id === selectedMember.id
            );
            await membershipToUpdate?.update({ role: newRole });

            toast.custom((t) => (
                <IconNotification
                    title="Role updated"
                    description={`${selectedMember.name}'s role has been changed to ${getRoleLabel(newRole)}.`}
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));

            setIsRoleModalOpen(false);
            setSelectedMember(null);
        } catch (error) {
            toast.custom((t) => (
                <IconNotification
                    title="Error"
                    description="Failed to update role. Please try again."
                    color="error"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRemoveMember = async () => {
        if (!selectedMember || !organization) return;

        setIsUpdating(true);
        try {
            await organization.removeMember(selectedMember.userId);

            toast.custom((t) => (
                <IconNotification
                    title="Member removed"
                    description={`${selectedMember.name} has been removed from the organization.`}
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));

            setIsRemoveModalOpen(false);
            setSelectedMember(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to remove member";
            toast.custom((t) => (
                <IconNotification
                    title="Error"
                    description={message}
                    color="error"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } finally {
            setIsUpdating(false);
        }
    };

    if (!organization) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
                <p className="text-tertiary">No organization selected.</p>
                <p className="text-sm text-quaternary">
                    Please select or create an organization in the General tab.
                </p>
            </div>
        );
    }

    const members = memberships?.data ?? [];

    return (
        <>
            <SectionHeader.Root>
                <SectionHeader.Group>
                    <div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                        <div className="flex items-center gap-2">
                            <SectionHeader.Heading>Team members</SectionHeader.Heading>
                            <Badge size="sm" type="modern" color="gray">
                                {members.length}
                            </Badge>
                        </div>
                        <SectionHeader.Subheading>
                            Manage members of {organization.name}.
                        </SectionHeader.Subheading>
                    </div>
                </SectionHeader.Group>
            </SectionHeader.Root>

            {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-secondary bg-secondary_alt py-12">
                    <p className="text-sm text-tertiary">No team members yet.</p>
                    <p className="text-sm text-quaternary">
                        Invite members from the Invitations tab.
                    </p>
                </div>
            ) : (
                <TableCard.Root className="-mx-4 rounded-none lg:mx-0 lg:rounded-xl">
                    <Table aria-label="Team members" selectionMode="none">
                        <Table.Header>
                            <Table.Head id="member" label="Member" isRowHeader className="w-full" />
                            <Table.Head id="role" label="Role" />
                            <Table.Head id="joined" label="Joined" />
                            {isAdmin && <Table.Head id="actions" label="" />}
                        </Table.Header>

                        <Table.Body items={members}>
                            {(member) => {
                                const publicUserData = member.publicUserData;
                                const name = publicUserData?.firstName && publicUserData?.lastName
                                    ? `${publicUserData.firstName} ${publicUserData.lastName}`
                                    : publicUserData?.identifier || "Unknown";
                                const email = publicUserData?.identifier || "";
                                const isCurrentUser = publicUserData?.userId === currentUser?.id;

                                return (
                                    <Table.Row id={member.id}>
                                        <Table.Cell>
                                            <div className="flex w-max items-center gap-3">
                                                <Avatar
                                                    src={publicUserData?.imageUrl}
                                                    alt={name}
                                                    size="md"
                                                    initials={getInitials(name)}
                                                />
                                                <div className="flex flex-col">
                                                    <p className="text-sm font-medium whitespace-nowrap text-primary">
                                                        {name}
                                                        {isCurrentUser && (
                                                            <span className="ml-1 text-tertiary">(you)</span>
                                                        )}
                                                    </p>
                                                    <p className="text-sm text-tertiary">{email}</p>
                                                </div>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Badge
                                                size="sm"
                                                type="color"
                                                color={getRoleBadgeColor(member.role)}
                                            >
                                                {getRoleLabel(member.role)}
                                            </Badge>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="text-sm text-tertiary whitespace-nowrap">
                                                {formatDate(member.createdAt)}
                                            </span>
                                        </Table.Cell>
                                        {isAdmin && (
                                            <Table.Cell>
                                                {!isCurrentUser && (
                                                    <Dropdown.Root>
                                                        <Dropdown.DotsButton />
                                                        <Dropdown.Popover className="w-48">
                                                            <Dropdown.Menu>
                                                                <Dropdown.Item
                                                                    icon={Edit05}
                                                                    onAction={() => {
                                                                        setSelectedMember({
                                                                            id: member.id,
                                                                            userId: publicUserData?.userId || "",
                                                                            name,
                                                                            role: member.role,
                                                                        });
                                                                        setNewRole(member.role);
                                                                        setIsRoleModalOpen(true);
                                                                    }}
                                                                >
                                                                    Change role
                                                                </Dropdown.Item>
                                                                <Dropdown.Separator />
                                                                <Dropdown.Item
                                                                    icon={UserX01}
                                                                    className="text-error-primary"
                                                                    onAction={() => {
                                                                        setSelectedMember({
                                                                            id: member.id,
                                                                            userId: publicUserData?.userId || "",
                                                                            name,
                                                                            role: member.role,
                                                                        });
                                                                        setIsRemoveModalOpen(true);
                                                                    }}
                                                                >
                                                                    Remove member
                                                                </Dropdown.Item>
                                                            </Dropdown.Menu>
                                                        </Dropdown.Popover>
                                                    </Dropdown.Root>
                                                )}
                                            </Table.Cell>
                                        )}
                                    </Table.Row>
                                );
                            }}
                        </Table.Body>
                    </Table>
                </TableCard.Root>
            )}

            {/* Change Role Modal */}
            <DialogTrigger isOpen={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
                <ModalOverlay>
                    <Modal>
                        <Dialog>
                            {({ close }) => (
                                <div className="flex w-full max-w-md flex-col gap-6 rounded-xl bg-primary p-6 shadow-xl">
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-lg font-semibold text-primary">Change role</h2>
                                        <p className="text-sm text-tertiary">
                                            Update the role for {selectedMember?.name}.
                                        </p>
                                    </div>

                                    <NativeSelect
                                        aria-label="Select role"
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                        options={[
                                            { label: "Admin", value: "org:admin" },
                                            { label: "Member", value: "org:member" },
                                        ]}
                                    />

                                    <div className="flex justify-end gap-3">
                                        <Button
                                            color="secondary"
                                            size="md"
                                            onClick={() => {
                                                close();
                                                setSelectedMember(null);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            color="primary"
                                            size="md"
                                            onClick={handleChangeRole}
                                            isLoading={isUpdating}
                                        >
                                            Update role
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Dialog>
                    </Modal>
                </ModalOverlay>
            </DialogTrigger>

            {/* Remove Member Modal */}
            <DialogTrigger isOpen={isRemoveModalOpen} onOpenChange={setIsRemoveModalOpen}>
                <ModalOverlay>
                    <Modal>
                        <Dialog>
                            {({ close }) => (
                                <div className="flex w-full max-w-md flex-col gap-6 rounded-xl bg-primary p-6 shadow-xl">
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-lg font-semibold text-primary">Remove member</h2>
                                        <p className="text-sm text-tertiary">
                                            Are you sure you want to remove {selectedMember?.name} from {organization.name}?
                                            This action cannot be undone.
                                        </p>
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <Button
                                            color="secondary"
                                            size="md"
                                            onClick={() => {
                                                close();
                                                setSelectedMember(null);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            color="primary-destructive"
                                            size="md"
                                            onClick={handleRemoveMember}
                                            isLoading={isUpdating}
                                        >
                                            Remove member
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
