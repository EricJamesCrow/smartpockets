"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useSession, useUser } from "@clerk/nextjs";
import type { SessionWithActivitiesResource } from "@clerk/types";
import { LogOut01, Monitor04, Phone01 } from "@untitledui/icons";
import { toast } from "sonner";
import { IconNotification } from "@repo/ui/untitledui/application/notifications/notifications";
import { SectionFooter } from "@repo/ui/untitledui/application/section-footers/section-footer";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { SectionLabel } from "@repo/ui/untitledui/application/section-headers/section-label";
import { BadgeWithDot } from "@repo/ui/untitledui/base/badges/badges";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Dropdown } from "@repo/ui/untitledui/base/dropdown/dropdown";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { HintText } from "@repo/ui/untitledui/base/input/hint-text";
import { InputBase, TextField } from "@repo/ui/untitledui/base/input/input";
import { Label } from "@repo/ui/untitledui/base/input/label";

type FieldErrors = {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
};

function getClerkErrorMessage(error: unknown): { field?: keyof FieldErrors; message: string } {
    if (error && typeof error === "object" && "errors" in error) {
        const clerkError = error as { errors: Array<{ code: string; message: string }> };
        const firstError = clerkError.errors[0];

        switch (firstError?.code) {
            case "form_password_incorrect":
                return { field: "currentPassword", message: "Current password is incorrect" };
            case "form_password_pwned":
                return { field: "newPassword", message: "This password was found in a data breach. Please choose a different one." };
            case "form_password_length_too_short":
                return { field: "newPassword", message: "Password must be at least 8 characters" };
            case "form_password_validation_failed":
                return { field: "newPassword", message: "Password doesn't meet requirements" };
            default:
                return { message: firstError?.message || "Something went wrong. Please try again." };
        }
    }
    return { message: "Something went wrong. Please try again." };
}

function formatSessionDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function getDeviceName(session: SessionWithActivitiesResource): string {
    const activity = session.latestActivity;
    if (!activity) return "Unknown device";

    const parts: string[] = [];
    if (activity.browserName) parts.push(activity.browserName);
    if (activity.deviceType) {
        const deviceType = activity.deviceType.charAt(0).toUpperCase() + activity.deviceType.slice(1);
        parts.push(`on ${deviceType}`);
    }

    return parts.length > 0 ? parts.join(" ") : "Unknown device";
}

function getDeviceLocation(session: SessionWithActivitiesResource): string {
    const activity = session.latestActivity;
    if (!activity) return "Unknown location";

    const parts: string[] = [];
    if (activity.city) parts.push(activity.city);
    if (activity.country) parts.push(activity.country);

    return parts.length > 0 ? parts.join(", ") : "Unknown location";
}

interface SessionActionsDropdownProps {
    isCurrent: boolean;
    onRevoke: () => void;
}

function SessionActionsDropdown({ isCurrent, onRevoke }: SessionActionsDropdownProps) {
    return (
        <Dropdown.Root>
            <Dropdown.DotsButton />
            <Dropdown.Popover className="w-min">
                <Dropdown.Menu>
                    <Dropdown.Item icon={LogOut01} isDisabled={isCurrent} onAction={onRevoke}>
                        <span className="pr-4">{isCurrent ? "Current session" : "Sign out"}</span>
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
}

export default function PasswordPage() {
    const { user } = useUser();
    const { session: currentSession } = useSession();

    // Form state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    // Sessions state
    const [sessions, setSessions] = useState<SessionWithActivitiesResource[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);

    const fetchSessions = useCallback(async () => {
        if (!user) return;
        try {
            const userSessions = await user.getSessions();
            setSessions(userSessions);
        } catch (error) {
            console.error("Failed to fetch sessions:", error);
        } finally {
            setSessionsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});

        // Client-side validation
        if (newPassword !== confirmPassword) {
            setFieldErrors({ confirmPassword: "Passwords don't match" });
            return;
        }
        if (newPassword.length < 8) {
            setFieldErrors({ newPassword: "Password must be at least 8 characters" });
            return;
        }

        if (!user) return;

        setIsLoading(true);
        try {
            await user.updatePassword({
                currentPassword,
                newPassword,
                signOutOfOtherSessions: true,
            });

            // Success toast
            toast.custom((t) => (
                <IconNotification
                    title="Password updated"
                    description="Your password has been changed successfully."
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));

            // Clear form
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            // Refresh sessions (other sessions were signed out)
            await fetchSessions();
        } catch (error) {
            const { field, message } = getClerkErrorMessage(error);

            if (field) {
                setFieldErrors({ [field]: message });
            } else {
                toast.custom((t) => (
                    <IconNotification title="Error" description={message} color="error" onClose={() => toast.dismiss(t)} />
                ));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevokeSession = async (session: SessionWithActivitiesResource) => {
        try {
            await session.revoke();

            toast.custom((t) => (
                <IconNotification
                    title="Session signed out"
                    description="The device has been signed out successfully."
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));

            await fetchSessions();
        } catch (error) {
            toast.custom((t) => (
                <IconNotification
                    title="Error"
                    description="Failed to sign out the session. Please try again."
                    color="error"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        }
    };

    const handleCancel = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setFieldErrors({});
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-6 px-4 lg:px-8">
                <SectionHeader.Root>
                    <SectionHeader.Group>
                        <div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                            <SectionHeader.Heading>Password</SectionHeader.Heading>
                            <SectionHeader.Subheading>Please enter your current password to change your password.</SectionHeader.Subheading>
                        </div>
                    </SectionHeader.Group>
                </SectionHeader.Root>

                <Form className="contents" onSubmit={handlePasswordChange}>
                    <div className="flex flex-col gap-5">
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                            <SectionLabel.Root isRequired size="sm" title="Current password" className="max-lg:hidden" />

                            <TextField
                                aria-label="Current password"
                                isRequired
                                name="currentPassword"
                                type="password"
                                autoComplete="current-password"
                                isInvalid={!!fieldErrors.currentPassword}
                            >
                                <Label className="lg:hidden">Current password</Label>
                                <InputBase
                                    size="md"
                                    placeholder="••••••••"
                                    value={currentPassword}
                                    onChange={(value) => setCurrentPassword(value)}
                                />
                                {fieldErrors.currentPassword && <HintText>{fieldErrors.currentPassword}</HintText>}
                            </TextField>
                        </div>

                        <hr className="h-px w-full border-none bg-border-secondary" />

                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                            <SectionLabel.Root isRequired size="sm" title="New password" className="max-lg:hidden" />

                            <TextField
                                aria-label="New password"
                                isRequired
                                name="newPassword"
                                type="password"
                                autoComplete="new-password"
                                isInvalid={!!fieldErrors.newPassword}
                            >
                                <Label className="lg:hidden">New password</Label>
                                <InputBase
                                    size="md"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(value) => setNewPassword(value)}
                                />
                                <HintText>
                                    {fieldErrors.newPassword || (
                                        <>
                                            <span className="max-lg:hidden">Your new password must be more than 8 characters.</span>
                                            <span className="lg:hidden">Must be more than 8 characters.</span>
                                        </>
                                    )}
                                </HintText>
                            </TextField>
                        </div>

                        <hr className="h-px w-full border-none bg-border-secondary" />

                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                            <SectionLabel.Root isRequired size="sm" title="Confirm new password" className="max-lg:hidden" />

                            <TextField
                                aria-label="Confirm new password"
                                isRequired
                                name="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                isInvalid={!!fieldErrors.confirmPassword}
                            >
                                <Label className="lg:hidden">Confirm new password</Label>
                                <InputBase
                                    size="md"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(value) => setConfirmPassword(value)}
                                />
                                {fieldErrors.confirmPassword && <HintText>{fieldErrors.confirmPassword}</HintText>}
                            </TextField>
                        </div>
                    </div>
                    <SectionFooter.Root>
                        <SectionFooter.Actions>
                            <Button color="secondary" size="md" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button type="submit" color="primary" size="md" isLoading={isLoading}>
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
                                We'll alert you via <span className="font-semibold">{user?.primaryEmailAddress?.emailAddress || "your email"}</span> if there is
                                any unusual activity on your account.
                            </SectionHeader.Subheading>
                        </div>
                    </SectionHeader.Group>
                </SectionHeader.Root>

                <div className="flex flex-col gap-5">
                    {sessionsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <p className="text-sm text-tertiary">Loading sessions...</p>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                            <p className="text-sm text-tertiary">No active sessions found.</p>
                        </div>
                    ) : (
                        sessions.map((session) => {
                            const isCurrent = session.id === currentSession?.id;
                            const isDesktop = session.latestActivity?.deviceType === "desktop" || !session.latestActivity?.deviceType;
                            const DeviceIcon = isDesktop ? Monitor04 : Phone01;

                            return (
                                <Fragment key={session.id}>
                                    <div className="flex items-start gap-4 lg:pl-4">
                                        <DeviceIcon className="size-6 shrink-0 text-fg-quaternary" />

                                        <div className="flex flex-1 flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-secondary">{getDeviceName(session)}</p>
                                                {isCurrent && (
                                                    <BadgeWithDot color="success" type="modern" size="sm">
                                                        Active now
                                                    </BadgeWithDot>
                                                )}
                                            </div>
                                            <p className="text-sm text-tertiary">
                                                {getDeviceLocation(session)} • {formatSessionDate(session.lastActiveAt)}
                                            </p>
                                        </div>

                                        <SessionActionsDropdown isCurrent={isCurrent} onRevoke={() => handleRevokeSession(session)} />
                                    </div>

                                    <hr className="h-px w-full border-none bg-border-secondary" />
                                </Fragment>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
