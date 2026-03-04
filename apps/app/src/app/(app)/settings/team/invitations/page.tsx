"use client";

import { useOrganization } from "@clerk/nextjs";
import { Mail01, RefreshCw01, Trash01 } from "@untitledui/icons";
import { toast } from "sonner";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconNotification } from "@repo/ui/untitledui/application/notifications/notifications";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { SectionLabel } from "@repo/ui/untitledui/application/section-headers/section-label";
import { Table, TableCard } from "@repo/ui/untitledui/application/table/table";
import { Badge, BadgeWithDot } from "@repo/ui/untitledui/base/badges/badges";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Dropdown } from "@repo/ui/untitledui/base/dropdown/dropdown";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { InputBase, TextField } from "@repo/ui/untitledui/base/input/input";
import { HintText } from "@repo/ui/untitledui/base/input/hint-text";
import { NativeSelect } from "@repo/ui/untitledui/base/select/select-native";
import { inviteMemberSchema, type InviteMemberFormValues } from "@/lib/validations";

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date);
}

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

function getStatusColor(status: string): "warning" | "success" | "error" | "gray" {
    switch (status) {
        case "pending":
            return "warning";
        case "accepted":
            return "success";
        case "revoked":
            return "error";
        default:
            return "gray";
    }
}

type StatusBadgeColor = "warning" | "success" | "error" | "gray";

export default function InvitationsPage() {
    const { organization, invitations, membership } = useOrganization({
        invitations: { pageSize: 50 },
    });

    const {
        control,
        handleSubmit,
        reset,
        setError,
        formState: { isSubmitting },
    } = useForm<InviteMemberFormValues>({
        resolver: zodResolver(inviteMemberSchema),
        defaultValues: { email: "", role: "org:member" },
    });

    const isAdmin = membership?.role === "org:admin";

    const onSubmit = async (data: InviteMemberFormValues) => {
        if (!organization) return;

        try {
            await organization.inviteMember({
                emailAddress: data.email,
                role: data.role,
            });

            toast.custom((t) => (
                <IconNotification
                    title="Invitation sent"
                    description={`An invitation has been sent to ${data.email}.`}
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));

            reset();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to send invitation";
            if (message.includes("already") || message.includes("exists")) {
                setError("email", { message: "This user is already a member or has a pending invitation" });
            } else {
                setError("email", { message });
            }
        }
    };

    const handleResendInvite = async (invitationId: string, inviteeEmail: string) => {
        try {
            const invitation = invitations?.data?.find((inv) => inv.id === invitationId);
            if (!invitation) return;

            // Clerk doesn't have a direct resend method, so we revoke and re-invite
            await invitation.revoke();
            await organization?.inviteMember({
                emailAddress: inviteeEmail,
                role: invitation.role,
            });

            toast.custom((t) => (
                <IconNotification
                    title="Invitation resent"
                    description={`A new invitation has been sent to ${inviteeEmail}.`}
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } catch (error) {
            toast.custom((t) => (
                <IconNotification
                    title="Error"
                    description="Failed to resend invitation. Please try again."
                    color="error"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        }
    };

    const handleRevokeInvite = async (invitationId: string, inviteeEmail: string) => {
        try {
            const invitation = invitations?.data?.find((inv) => inv.id === invitationId);
            await invitation?.revoke();

            toast.custom((t) => (
                <IconNotification
                    title="Invitation revoked"
                    description={`The invitation to ${inviteeEmail} has been revoked.`}
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } catch (error) {
            toast.custom((t) => (
                <IconNotification
                    title="Error"
                    description="Failed to revoke invitation. Please try again."
                    color="error"
                    onClose={() => toast.dismiss(t)}
                />
            ));
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

    const pendingInvitations = invitations?.data?.filter((inv) => inv.status === "pending") ?? [];

    return (
        <div className="flex flex-col gap-8">
            {/* Invite Form */}
            {isAdmin && (
                <>
                    <SectionHeader.Root>
                        <SectionHeader.Group>
                            <div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                                <SectionHeader.Heading>Invite team members</SectionHeader.Heading>
                                <SectionHeader.Subheading>
                                    Invite new members to join {organization.name}.
                                </SectionHeader.Subheading>
                            </div>
                        </SectionHeader.Group>
                    </SectionHeader.Root>

                    <Form onSubmit={handleSubmit(onSubmit)} className="contents">
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                            <SectionLabel.Root
                                size="sm"
                                title="Email address"
                                description="Enter the email address of the person you want to invite."
                            />

                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-4 sm:flex-row">
                                    <Controller
                                        control={control}
                                        name="email"
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                aria-label="Email address"
                                                type="email"
                                                isRequired
                                                className="flex-1"
                                                value={field.value}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                isInvalid={!!fieldState.error}
                                            >
                                                <InputBase
                                                    size="md"
                                                    placeholder="colleague@example.com"
                                                    icon={Mail01}
                                                />
                                                {fieldState.error && <HintText>{fieldState.error.message}</HintText>}
                                            </TextField>
                                        )}
                                    />

                                    <Controller
                                        control={control}
                                        name="role"
                                        render={({ field }) => (
                                            <NativeSelect
                                                aria-label="Select role"
                                                className="sm:w-40"
                                                value={field.value}
                                                onChange={(e) => field.onChange(e.target.value)}
                                                onBlur={field.onBlur}
                                                options={[
                                                    { label: "Member", value: "org:member" },
                                                    { label: "Admin", value: "org:admin" },
                                                ]}
                                            />
                                        )}
                                    />
                                </div>

                                <div className="flex justify-start">
                                    <Button
                                        type="submit"
                                        color="primary"
                                        size="md"
                                        isLoading={isSubmitting}
                                    >
                                        Send invitation
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Form>

                    <hr className="h-px w-full border-none bg-border-secondary" />
                </>
            )}

            {/* Pending Invitations */}
            <SectionHeader.Root>
                <SectionHeader.Group>
                    <div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                        <div className="flex items-center gap-2">
                            <SectionHeader.Heading>Pending invitations</SectionHeader.Heading>
                            {pendingInvitations.length > 0 && (
                                <Badge size="sm" type="color" color="warning">
                                    {pendingInvitations.length}
                                </Badge>
                            )}
                        </div>
                        <SectionHeader.Subheading>
                            Invitations that haven't been accepted yet.
                        </SectionHeader.Subheading>
                    </div>
                </SectionHeader.Group>
            </SectionHeader.Root>

            {pendingInvitations.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-secondary bg-secondary_alt py-12">
                    <p className="text-sm text-tertiary">No pending invitations.</p>
                    {isAdmin && (
                        <p className="text-sm text-quaternary">
                            Use the form above to invite new team members.
                        </p>
                    )}
                </div>
            ) : (
                <TableCard.Root className="-mx-4 rounded-none lg:mx-0 lg:rounded-xl">
                    <Table aria-label="Pending invitations" selectionMode="none">
                        <Table.Header>
                            <Table.Head id="email" label="Email" isRowHeader className="w-full" />
                            <Table.Head id="role" label="Role" />
                            <Table.Head id="status" label="Status" />
                            <Table.Head id="sent" label="Sent" />
                            {isAdmin && <Table.Head id="actions" label="" />}
                        </Table.Header>

                        <Table.Body items={pendingInvitations}>
                            {(invitation) => (
                                <Table.Row id={invitation.id}>
                                    <Table.Cell>
                                        <span className="text-sm font-medium text-primary">
                                            {invitation.emailAddress}
                                        </span>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge size="sm" type="modern" color="gray">
                                            {getRoleLabel(invitation.role)}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <BadgeWithDot
                                            size="sm"
                                            type="pill-color"
                                            color={getStatusColor(invitation.status)}
                                        >
                                            {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                                        </BadgeWithDot>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <span className="text-sm text-tertiary whitespace-nowrap">
                                            {formatDate(invitation.createdAt)}
                                        </span>
                                    </Table.Cell>
                                    {isAdmin && (
                                        <Table.Cell>
                                            <Dropdown.Root>
                                                <Dropdown.DotsButton />
                                                <Dropdown.Popover className="w-48">
                                                    <Dropdown.Menu>
                                                        <Dropdown.Item
                                                            icon={RefreshCw01}
                                                            onAction={() =>
                                                                handleResendInvite(invitation.id, invitation.emailAddress)
                                                            }
                                                        >
                                                            Resend invitation
                                                        </Dropdown.Item>
                                                        <Dropdown.Separator />
                                                        <Dropdown.Item
                                                            icon={Trash01}
                                                            className="text-error-primary"
                                                            onAction={() =>
                                                                handleRevokeInvite(invitation.id, invitation.emailAddress)
                                                            }
                                                        >
                                                            Revoke invitation
                                                        </Dropdown.Item>
                                                    </Dropdown.Menu>
                                                </Dropdown.Popover>
                                            </Dropdown.Root>
                                        </Table.Cell>
                                    )}
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table>
                </TableCard.Root>
            )}
        </div>
    );
}
