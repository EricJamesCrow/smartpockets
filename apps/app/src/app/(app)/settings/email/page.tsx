"use client";

import { Fragment, useState } from "react";
import { useUser } from "@clerk/nextjs";
import type { EmailAddressResource } from "@clerk/types";
import { Mail01, Star01, Trash02 } from "@untitledui/icons";
import { toast } from "sonner";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@repo/ui/untitledui/application/modals/modal";
import { IconNotification } from "@repo/ui/untitledui/application/notifications/notifications";
import { SectionFooter } from "@repo/ui/untitledui/application/section-footers/section-footer";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { SectionLabel } from "@repo/ui/untitledui/application/section-headers/section-label";
import { BadgeWithDot } from "@repo/ui/untitledui/base/badges/badges";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Dropdown } from "@repo/ui/untitledui/base/dropdown/dropdown";
import { HintText } from "@repo/ui/untitledui/base/input/hint-text";
import { InputBase, TextField } from "@repo/ui/untitledui/base/input/input";
import { Label } from "@repo/ui/untitledui/base/input/label";

function getClerkErrorMessage(error: unknown): string {
    if (error && typeof error === "object" && "errors" in error) {
        const clerkError = error as { errors: Array<{ code: string; message: string }> };
        const firstError = clerkError.errors[0];

        switch (firstError?.code) {
            case "form_identifier_exists":
                return "This email is already in use";
            case "form_param_format_invalid":
                return "Please enter a valid email address";
            case "form_code_incorrect":
                return "Incorrect verification code";
            case "verification_expired":
                return "Verification code expired. Please request a new one.";
            default:
                return firstError?.message || "Something went wrong. Please try again.";
        }
    }
    return "Something went wrong. Please try again.";
}

interface EmailActionsDropdownProps {
    email: EmailAddressResource;
    isPrimary: boolean;
    isVerified: boolean;
    canRemove: boolean;
    onMakePrimary: () => void;
    onRemove: () => void;
    onVerify: () => void;
    isLoading: boolean;
}

function EmailActionsDropdown({ email, isPrimary, isVerified, canRemove, onMakePrimary, onRemove, onVerify, isLoading }: EmailActionsDropdownProps) {
    return (
        <Dropdown.Root>
            <Dropdown.DotsButton />
            <Dropdown.Popover className="w-min">
                <Dropdown.Menu>
                    {!isVerified && (
                        <Dropdown.Item icon={Mail01} onAction={onVerify} isDisabled={isLoading}>
                            <span className="pr-4">Verify email</span>
                        </Dropdown.Item>
                    )}
                    {isVerified && !isPrimary && (
                        <Dropdown.Item icon={Star01} onAction={onMakePrimary} isDisabled={isLoading}>
                            <span className="pr-4">Make primary</span>
                        </Dropdown.Item>
                    )}
                    <Dropdown.Item icon={Trash02} onAction={onRemove} isDisabled={!canRemove || isLoading}>
                        <span className="pr-4">{isPrimary ? "Primary email" : "Remove"}</span>
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
}

export default function EmailPage() {
    const { user } = useUser();

    // Add email form state
    const [newEmailAddress, setNewEmailAddress] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState("");

    // Verification modal state
    const [verifyingEmail, setVerifyingEmail] = useState<EmailAddressResource | null>(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState("");
    const [isResending, setIsResending] = useState(false);

    // Loading state for actions
    const [loadingEmailId, setLoadingEmailId] = useState<string | null>(null);

    const emails = user?.emailAddresses || [];
    const canRemoveEmails = emails.length > 1;

    const handleAddEmail = async () => {
        if (!user || !newEmailAddress.trim()) return;

        setAddError("");
        setIsAdding(true);

        try {
            const email = await user.createEmailAddress({ email: newEmailAddress.trim() });
            await email.prepareVerification({ strategy: "email_code" });

            setNewEmailAddress("");
            setVerifyingEmail(email);
            setVerificationCode("");
            setVerifyError("");

            toast.custom((t) => (
                <IconNotification
                    title="Verification code sent"
                    description={`We've sent a code to ${newEmailAddress.trim()}`}
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } catch (error) {
            setAddError(getClerkErrorMessage(error));
        } finally {
            setIsAdding(false);
        }
    };

    const handleVerifyEmail = async () => {
        if (!verifyingEmail || !verificationCode.trim()) return;

        setVerifyError("");
        setIsVerifying(true);

        try {
            await verifyingEmail.attemptVerification({ code: verificationCode.trim() });

            toast.custom((t) => (
                <IconNotification title="Email verified" description="Your email has been verified successfully." color="success" onClose={() => toast.dismiss(t)} />
            ));

            setVerifyingEmail(null);
            setVerificationCode("");
        } catch (error) {
            setVerifyError(getClerkErrorMessage(error));
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResendCode = async () => {
        if (!verifyingEmail) return;

        setIsResending(true);
        try {
            await verifyingEmail.prepareVerification({ strategy: "email_code" });

            toast.custom((t) => (
                <IconNotification
                    title="Code resent"
                    description={`A new verification code has been sent to ${verifyingEmail.emailAddress}`}
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } catch (error) {
            toast.custom((t) => (
                <IconNotification title="Error" description={getClerkErrorMessage(error)} color="error" onClose={() => toast.dismiss(t)} />
            ));
        } finally {
            setIsResending(false);
        }
    };

    const handleMakePrimary = async (email: EmailAddressResource) => {
        if (!user) return;

        setLoadingEmailId(email.id);
        try {
            await user.update({ primaryEmailAddressId: email.id });

            toast.custom((t) => (
                <IconNotification
                    title="Primary email updated"
                    description={`${email.emailAddress} is now your primary email.`}
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } catch (error) {
            toast.custom((t) => (
                <IconNotification title="Error" description={getClerkErrorMessage(error)} color="error" onClose={() => toast.dismiss(t)} />
            ));
        } finally {
            setLoadingEmailId(null);
        }
    };

    const handleRemoveEmail = async (email: EmailAddressResource) => {
        if (!canRemoveEmails) return;

        setLoadingEmailId(email.id);
        try {
            await email.destroy();

            toast.custom((t) => (
                <IconNotification title="Email removed" description={`${email.emailAddress} has been removed from your account.`} color="success" onClose={() => toast.dismiss(t)} />
            ));
        } catch (error) {
            toast.custom((t) => (
                <IconNotification title="Error" description={getClerkErrorMessage(error)} color="error" onClose={() => toast.dismiss(t)} />
            ));
        } finally {
            setLoadingEmailId(null);
        }
    };

    const handleStartVerification = async (email: EmailAddressResource) => {
        setLoadingEmailId(email.id);
        try {
            await email.prepareVerification({ strategy: "email_code" });
            setVerifyingEmail(email);
            setVerificationCode("");
            setVerifyError("");
        } catch (error) {
            toast.custom((t) => (
                <IconNotification title="Error" description={getClerkErrorMessage(error)} color="error" onClose={() => toast.dismiss(t)} />
            ));
        } finally {
            setLoadingEmailId(null);
        }
    };

    const handleCloseVerificationModal = () => {
        setVerifyingEmail(null);
        setVerificationCode("");
        setVerifyError("");
    };

    return (
        <div className="flex flex-col gap-8">
            {/* Email list section */}
            <div className="flex flex-col gap-6 px-4 lg:px-8">
                <SectionHeader.Root>
                    <SectionHeader.Group>
                        <div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                            <SectionHeader.Heading>Email addresses</SectionHeader.Heading>
                            <SectionHeader.Subheading>Manage your email addresses for account access and notifications.</SectionHeader.Subheading>
                        </div>
                    </SectionHeader.Group>
                </SectionHeader.Root>

                <div className="flex flex-col gap-5">
                    {emails.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                            <p className="text-sm text-tertiary">No email addresses found.</p>
                        </div>
                    ) : (
                        emails.map((email) => {
                            const isPrimary = email.id === user?.primaryEmailAddressId;
                            const isVerified = email.verification?.status === "verified";
                            const isLoading = loadingEmailId === email.id;

                            return (
                                <Fragment key={email.id}>
                                    <div className="flex items-start gap-4 lg:pl-4">
                                        <Mail01 className="size-6 shrink-0 text-fg-quaternary" />

                                        <div className="flex flex-1 flex-col gap-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-medium text-secondary">{email.emailAddress}</p>
                                                {isPrimary && (
                                                    <BadgeWithDot color="success" type="modern" size="sm">
                                                        Primary
                                                    </BadgeWithDot>
                                                )}
                                                {!isVerified && (
                                                    <BadgeWithDot color="warning" type="modern" size="sm">
                                                        Unverified
                                                    </BadgeWithDot>
                                                )}
                                            </div>
                                            {isPrimary && <p className="text-sm text-tertiary">Used for account access and notifications</p>}
                                        </div>

                                        <EmailActionsDropdown
                                            email={email}
                                            isPrimary={isPrimary}
                                            isVerified={isVerified}
                                            canRemove={canRemoveEmails && !isPrimary}
                                            onMakePrimary={() => handleMakePrimary(email)}
                                            onRemove={() => handleRemoveEmail(email)}
                                            onVerify={() => handleStartVerification(email)}
                                            isLoading={isLoading}
                                        />
                                    </div>

                                    <hr className="h-px w-full border-none bg-border-secondary" />
                                </Fragment>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Add email section */}
            <div className="flex flex-col gap-6 px-4 lg:px-8">
                <SectionHeader.Root>
                    <SectionHeader.Group>
                        <div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                            <SectionHeader.Heading>Add email address</SectionHeader.Heading>
                            <SectionHeader.Subheading>Add a new email address to your account.</SectionHeader.Subheading>
                        </div>
                    </SectionHeader.Group>
                </SectionHeader.Root>

                <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                        <SectionLabel.Root size="sm" title="Email address" className="max-lg:hidden" />

                        <TextField
                            aria-label="New email address"
                            name="newEmail"
                            type="email"
                            isInvalid={!!addError}
                            value={newEmailAddress}
                            onChange={(value) => {
                                setNewEmailAddress(value);
                                setAddError("");
                            }}
                        >
                            <Label className="lg:hidden">Email address</Label>
                            <InputBase size="md" placeholder="you@example.com" />
                            {addError && <HintText>{addError}</HintText>}
                        </TextField>
                    </div>
                </div>

                <SectionFooter.Root>
                    <SectionFooter.Actions>
                        <Button
                            color="secondary"
                            size="md"
                            onClick={() => {
                                setNewEmailAddress("");
                                setAddError("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button color="primary" size="md" isLoading={isAdding} onClick={handleAddEmail} isDisabled={!newEmailAddress.trim()}>
                            Add email
                        </Button>
                    </SectionFooter.Actions>
                </SectionFooter.Root>
            </div>

            {/* Verification Modal */}
            {verifyingEmail && (
                <DialogTrigger isOpen={!!verifyingEmail} onOpenChange={(open) => !open && handleCloseVerificationModal()}>
                    <ModalOverlay>
                        <Modal>
                            <Dialog>
                                {({ close }) => (
                                    <div className="flex w-full max-w-md flex-col gap-6 rounded-xl bg-primary p-6 shadow-xl">
                                        <div className="flex flex-col gap-1">
                                            <h2 className="text-lg font-semibold text-primary">Verify your email</h2>
                                            <p className="text-sm text-tertiary">
                                                Enter the 6-digit code we sent to <span className="font-medium text-secondary">{verifyingEmail.emailAddress}</span>
                                            </p>
                                        </div>

                                        <TextField
                                            aria-label="Verification code"
                                            isInvalid={!!verifyError}
                                            maxLength={6}
                                            value={verificationCode}
                                            onChange={(value) => {
                                                setVerificationCode(value);
                                                setVerifyError("");
                                            }}
                                        >
                                            <Label>Verification code</Label>
                                            <InputBase size="md" placeholder="000000" />
                                            {verifyError && <HintText>{verifyError}</HintText>}
                                        </TextField>

                                        <div className="flex items-center justify-between">
                                            <Button color="link-gray" size="sm" onClick={handleResendCode} isLoading={isResending}>
                                                Resend code
                                            </Button>
                                        </div>

                                        <div className="flex gap-3">
                                            <Button color="secondary" size="md" className="flex-1" onClick={close}>
                                                Cancel
                                            </Button>
                                            <Button
                                                color="primary"
                                                size="md"
                                                className="flex-1"
                                                isLoading={isVerifying}
                                                onClick={handleVerifyEmail}
                                                isDisabled={verificationCode.length < 6}
                                            >
                                                Verify
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Dialog>
                        </Modal>
                    </ModalOverlay>
                </DialogTrigger>
            )}
        </div>
    );
}
