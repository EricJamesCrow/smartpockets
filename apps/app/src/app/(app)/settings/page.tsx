"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { FileUpload } from "@repo/ui/untitledui/application/file-upload/file-upload-base";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@repo/ui/untitledui/application/modals/modal";
import { IconNotification } from "@repo/ui/untitledui/application/notifications/notifications";
import { SectionFooter } from "@repo/ui/untitledui/application/section-footers/section-footer";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { SectionLabel } from "@repo/ui/untitledui/application/section-headers/section-label";
import { Avatar } from "@repo/ui/untitledui/base/avatar/avatar";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { InputBase, TextField } from "@repo/ui/untitledui/base/input/input";
import { Label } from "@repo/ui/untitledui/base/input/label";
import { toast } from "sonner";

function getClerkErrorMessage(error: unknown): { field?: string; message: string } {
    console.error("Clerk update error:", error);

    if (error && typeof error === "object" && "errors" in error) {
        const clerkError = error as { errors: Array<{ code: string; message: string; longMessage?: string; meta?: { paramName?: string } }> };
        const firstError = clerkError.errors[0];

        console.error("Clerk error details:", {
            code: firstError?.code,
            message: firstError?.message,
            longMessage: firstError?.longMessage,
            meta: firstError?.meta,
        });

        switch (firstError?.code) {
            case "form_param_format_invalid":
                return { field: firstError.meta?.paramName, message: firstError.longMessage || firstError.message || "Invalid format" };
            default:
                return { message: firstError?.longMessage || firstError?.message || "Something went wrong. Please try again." };
        }
    }
    return { message: "Something went wrong. Please try again." };
}

export default function SettingsPage() {
    const { user, isLoaded } = useUser();

    // Form state - Clerk native fields only
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    // Avatar state
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    // Loading state
    const [isLoading, setIsLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Delete account state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    // Initialize form from Clerk user data
    useEffect(() => {
        if (user) {
            setFirstName(user.firstName || "");
            setLastName(user.lastName || "");
            setAvatarPreview(user.imageUrl || null);
        }
    }, [user]);

    // Revoke any blob preview URL when it's replaced or the component unmounts.
    useEffect(() => {
        return () => {
            if (avatarPreview?.startsWith("blob:")) {
                URL.revokeObjectURL(avatarPreview);
            }
        };
    }, [avatarPreview]);

    const handleAvatarUpload = (files: FileList | null) => {
        const file = files?.[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsLoading(true);
        setFieldErrors({});

        try {
            // Update avatar if a new file was selected
            if (avatarFile) {
                await user.setProfileImage({ file: avatarFile });
                setAvatarFile(null);
            }

            // Update profile - Clerk native fields only
            await user.update({
                firstName,
                lastName,
            });

            toast.custom((t) => (
                <IconNotification
                    title="Profile updated"
                    description="Your profile has been saved successfully."
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } catch (error) {
            const { field, message } = getClerkErrorMessage(error);

            if (field) {
                setFieldErrors({ [field]: message });
            } else {
                toast.custom((t) => <IconNotification title="Error" description={message} color="error" onClose={() => toast.dismiss(t)} />);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        if (user) {
            setFirstName(user.firstName || "");
            setLastName(user.lastName || "");
            setAvatarPreview(user.imageUrl || null);
            setAvatarFile(null);
        }
        setFieldErrors({});
    };

    const handleDeleteAccount = async () => {
        if (!user || deleteConfirmation !== "DELETE") return;

        setIsDeleting(true);
        try {
            await user.delete();
            // Clerk will automatically redirect to the sign-in page after deletion
        } catch (error) {
            toast.custom((t) => (
                <IconNotification title="Error" description="Failed to delete account. Please try again." color="error" onClose={() => toast.dismiss(t)} />
            ));
            setIsDeleting(false);
        }
    };

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center py-16">
                <p className="text-tertiary text-sm">Loading...</p>
            </div>
        );
    }

    return (
        <>
            <Form className="flex flex-col gap-6 px-4 lg:px-8" onSubmit={handleSubmit}>
                <SectionHeader.Root>
                    <SectionHeader.Group>
                        <div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                            <SectionHeader.Heading>Profile</SectionHeader.Heading>
                            <SectionHeader.Subheading>Update your photo and personal details here.</SectionHeader.Subheading>
                        </div>
                    </SectionHeader.Group>
                </SectionHeader.Root>

                {/* Form content */}
                <div className="flex flex-col gap-5">
                    {/* First Name / Last Name */}
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                        <SectionLabel.Root isRequired size="sm" title="Name" className="max-lg:hidden" />

                        <div className="flex gap-4">
                            <TextField aria-label="First name" isRequired name="firstName" className="flex-1" value={firstName} onChange={setFirstName}>
                                <Label className="lg:hidden">First name</Label>
                                <InputBase size="md" placeholder="First name" />
                            </TextField>

                            <TextField aria-label="Last name" isRequired name="lastName" className="flex-1" value={lastName} onChange={setLastName}>
                                <Label className="lg:hidden">Last name</Label>
                                <InputBase size="md" placeholder="Last name" />
                            </TextField>
                        </div>
                    </div>

                    <hr className="bg-border-secondary h-px w-full border-none" />

                    {/* Your photo */}
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                        <SectionLabel.Root size="sm" title="Your photo" description="This will be displayed on your profile." />
                        <div className="flex flex-col gap-5 lg:flex-row">
                            <Avatar size="2xl" src={avatarPreview || undefined} />
                            <FileUpload.DropZone
                                className="w-full"
                                accept="image/*"
                                allowsMultiple={false}
                                onDropFiles={(files) => handleAvatarUpload(files)}
                            />
                        </div>
                    </div>
                </div>

                <SectionFooter.Root className="-mt-1 lg:mt-0">
                    <SectionFooter.Actions>
                        <Button color="secondary" size="md" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" color="primary" size="md" isLoading={isLoading}>
                            Save
                        </Button>
                    </SectionFooter.Actions>
                </SectionFooter.Root>
            </Form>

            <div className="mt-8 flex flex-col gap-6 px-4 lg:px-8">
                <hr className="bg-border-secondary h-px w-full border-none" />

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                    <SectionLabel.Root size="sm" title="Danger zone" description="Irreversible and destructive actions." className="text-fg-error-primary" />

                    <div className="border-border-error-subtle bg-bg-error-primary flex flex-col gap-4 rounded-xl border p-4">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-fg-error-primary text-sm font-semibold">Delete account</h3>
                            <p className="text-fg-error-secondary text-sm">Once you delete your account, there is no going back. Please be certain.</p>
                        </div>
                        <div>
                            <Button color="primary-destructive" size="sm" onClick={() => setIsDeleteModalOpen(true)}>
                                Delete account
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Delete Account Modal */}
                <DialogTrigger isOpen={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                    <ModalOverlay>
                        <Modal>
                            <Dialog>
                                {({ close }) => (
                                    <div className="bg-primary flex w-full max-w-md flex-col gap-6 rounded-xl p-6 shadow-xl">
                                        <div className="flex flex-col gap-1">
                                            <h2 className="text-primary text-lg font-semibold">Delete account</h2>
                                            <p className="text-tertiary text-sm">Are you sure you want to delete your account? This action cannot be undone.</p>
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            <TextField aria-label="Confirmation" isRequired value={deleteConfirmation} onChange={setDeleteConfirmation}>
                                                <Label>Type "DELETE" to confirm</Label>
                                                <InputBase size="md" placeholder="DELETE" />
                                            </TextField>
                                        </div>

                                        <div className="flex justify-end gap-3">
                                            <Button
                                                color="secondary"
                                                size="md"
                                                onClick={() => {
                                                    close();
                                                    setDeleteConfirmation("");
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                color="primary-destructive"
                                                size="md"
                                                onClick={handleDeleteAccount}
                                                isLoading={isDeleting}
                                                isDisabled={deleteConfirmation !== "DELETE"}
                                            >
                                                Delete account
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Dialog>
                        </Modal>
                    </ModalOverlay>
                </DialogTrigger>
            </div>
        </>
    );
}
