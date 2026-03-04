"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { deleteAccountSchema, profileSchema, type DeleteAccountFormValues, type ProfileFormValues } from "@/lib/validations";

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

    // Profile form
    const {
        control,
        handleSubmit,
        reset,
        setError,
        formState: { isSubmitting },
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: { firstName: "", lastName: "" },
    });

    // Avatar state (not part of react-hook-form since it's a file upload)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    // Delete account form
    const deleteForm = useForm<DeleteAccountFormValues>({
        resolver: zodResolver(deleteAccountSchema),
        defaultValues: { confirmation: "" as "DELETE" },
    });

    // Delete account state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Initialize form from Clerk user data
    useEffect(() => {
        if (user) {
            reset({ firstName: user.firstName || "", lastName: user.lastName || "" });
            setAvatarPreview(user.imageUrl || null);
        }
    }, [user, reset]);

    const handleAvatarUpload = (files: FileList | null) => {
        const file = files?.[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const onSubmit = async (data: ProfileFormValues) => {
        if (!user) return;

        try {
            // Update avatar if a new file was selected
            if (avatarFile) {
                await user.setProfileImage({ file: avatarFile });
                setAvatarFile(null);
            }

            // Update profile - Clerk native fields only
            await user.update({
                firstName: data.firstName,
                lastName: data.lastName,
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

            if (field === "firstName" || field === "lastName") {
                setError(field, { message });
            } else {
                toast.custom((t) => <IconNotification title="Error" description={message} color="error" onClose={() => toast.dismiss(t)} />);
            }
        }
    };

    const handleCancel = () => {
        if (user) {
            reset({ firstName: user.firstName || "", lastName: user.lastName || "" });
            setAvatarPreview(user.imageUrl || null);
            setAvatarFile(null);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) return;

        try {
            await user.delete();
            // Clerk will automatically redirect to the sign-in page after deletion
        } catch (error) {
            toast.custom((t) => (
                <IconNotification title="Error" description="Failed to delete account. Please try again." color="error" onClose={() => toast.dismiss(t)} />
            ));
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
            <Form className="flex flex-col gap-6 px-4 lg:px-8" onSubmit={handleSubmit(onSubmit)}>
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
                            <Controller
                                control={control}
                                name="firstName"
                                render={({ field, fieldState }) => (
                                    <TextField
                                        aria-label="First name"
                                        isRequired
                                        name="firstName"
                                        className="flex-1"
                                        value={field.value}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        isInvalid={!!fieldState.error}
                                    >
                                        <Label className="lg:hidden">First name</Label>
                                        <InputBase size="md" placeholder="First name" />
                                    </TextField>
                                )}
                            />

                            <Controller
                                control={control}
                                name="lastName"
                                render={({ field, fieldState }) => (
                                    <TextField
                                        aria-label="Last name"
                                        isRequired
                                        name="lastName"
                                        className="flex-1"
                                        value={field.value}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        isInvalid={!!fieldState.error}
                                    >
                                        <Label className="lg:hidden">Last name</Label>
                                        <InputBase size="md" placeholder="Last name" />
                                    </TextField>
                                )}
                            />
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
                        <Button type="submit" color="primary" size="md" isLoading={isSubmitting}>
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
                                            <Controller
                                                control={deleteForm.control}
                                                name="confirmation"
                                                render={({ field, fieldState }) => (
                                                    <TextField
                                                        aria-label="Confirmation"
                                                        isRequired
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        onBlur={field.onBlur}
                                                        isInvalid={!!fieldState.error}
                                                    >
                                                        <Label>Type "DELETE" to confirm</Label>
                                                        <InputBase size="md" placeholder="DELETE" />
                                                    </TextField>
                                                )}
                                            />
                                        </div>

                                        <div className="flex justify-end gap-3">
                                            <Button
                                                color="secondary"
                                                size="md"
                                                onClick={() => {
                                                    close();
                                                    deleteForm.reset();
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                color="primary-destructive"
                                                size="md"
                                                onClick={deleteForm.handleSubmit(handleDeleteAccount)}
                                                isLoading={deleteForm.formState.isSubmitting}
                                                isDisabled={deleteForm.watch("confirmation") !== "DELETE"}
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
