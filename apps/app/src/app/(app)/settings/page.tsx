"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Mail01 } from "@untitledui/icons";
import { toast } from "sonner";
import { FileUpload } from "@repo/ui/untitledui/application/file-upload/file-upload-base";
import { IconNotification } from "@repo/ui/untitledui/application/notifications/notifications";
import { SectionFooter } from "@repo/ui/untitledui/application/section-footers/section-footer";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { SectionLabel } from "@repo/ui/untitledui/application/section-headers/section-label";
import { Avatar } from "@repo/ui/untitledui/base/avatar/avatar";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@repo/ui/untitledui/application/modals/modal";
import { HintText } from "@repo/ui/untitledui/base/input/hint-text";
import { Checkbox } from "@repo/ui/untitledui/base/checkbox/checkbox";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { InputBase, TextField } from "@repo/ui/untitledui/base/input/input";
import { InputGroup } from "@repo/ui/untitledui/base/input/input-group";
import { Label } from "@repo/ui/untitledui/base/input/label";
import { Select } from "@repo/ui/untitledui/base/select/select";
import { TextEditor } from "@repo/ui/untitledui/base/text-editor/text-editor";
import { countriesOptions } from "@/utils/countries";
import { timezonesOptionsWithLongName } from "@/utils/timezones";

interface UserMetadata {
    website?: string;
    bio?: string;
    jobTitle?: string;
    showJobTitle?: boolean;
    alternativeEmail?: string;
    country?: string;
    timezone?: string;
}

/**
 * Detects the user's timezone from the browser and returns a matching timezone ID.
 * Uses the browser's timezone offset to find the closest match in our timezone list.
 */
function detectTimezone(): string | null {
    try {
        const offsetMinutes = new Date().getTimezoneOffset();
        // offsetMinutes is negative for east of UTC, positive for west
        // e.g., UTC-8 (PST) = 480, UTC+5:30 (IST) = -330
        const hours = Math.floor(Math.abs(offsetMinutes) / 60);
        const minutes = Math.abs(offsetMinutes) % 60;
        const sign = offsetMinutes <= 0 ? "+" : "−"; // Note: using − (U+2212) to match our data

        // Format: "UTC+05:30" or "UTC−08:00"
        const formatted = `UTC${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

        // Check if this exact offset exists in our options
        const match = timezonesOptionsWithLongName.find((tz) => tz.id === formatted);
        return match ? formatted : null;
    } catch {
        return null;
    }
}

function getClerkErrorMessage(error: unknown): { field?: string; message: string } {
    if (error && typeof error === "object" && "errors" in error) {
        const clerkError = error as { errors: Array<{ code: string; message: string; meta?: { paramName?: string } }> };
        const firstError = clerkError.errors[0];

        switch (firstError?.code) {
            case "form_identifier_exists":
                return { field: "username", message: "This username is already taken" };
            case "form_param_format_invalid":
                return { field: firstError.meta?.paramName, message: "Invalid format" };
            default:
                return { message: firstError?.message || "Something went wrong. Please try again." };
        }
    }
    return { message: "Something went wrong. Please try again." };
}

export default function SettingsPage() {
    const { user, isLoaded } = useUser();

    // Form state
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [website, setWebsite] = useState("");
    const [bio, setBio] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [showJobTitle, setShowJobTitle] = useState(true);
    const [alternativeEmail, setAlternativeEmail] = useState("");
    const [country, setCountry] = useState("");
    const [timezone, setTimezone] = useState("");

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
            setUsername(user.username || "");
            setAvatarPreview(user.imageUrl || null);

            const metadata = user.unsafeMetadata as UserMetadata;
            setWebsite(metadata?.website || "");
            setBio(metadata?.bio || "");
            setJobTitle(metadata?.jobTitle || "");
            setShowJobTitle(metadata?.showJobTitle !== false);
            setAlternativeEmail(metadata?.alternativeEmail || "");
            setCountry(metadata?.country || "");
            // Auto-detect timezone if user hasn't saved one
            setTimezone(metadata?.timezone || detectTimezone() || "");
        }
    }, [user]);

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

            // Update profile
            await user.update({
                firstName,
                lastName,
                username: username || undefined,
                unsafeMetadata: {
                    website,
                    bio,
                    jobTitle,
                    showJobTitle,
                    alternativeEmail,
                    country,
                    timezone,
                },
            });

            toast.custom((t) => (
                <IconNotification title="Profile updated" description="Your profile has been saved successfully." color="success" onClose={() => toast.dismiss(t)} />
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
            setUsername(user.username || "");
            setAvatarPreview(user.imageUrl || null);
            setAvatarFile(null);

            const metadata = user.unsafeMetadata as UserMetadata;
            setWebsite(metadata?.website || "");
            setBio(metadata?.bio || "");
            setJobTitle(metadata?.jobTitle || "");
            setShowJobTitle(metadata?.showJobTitle !== false);
            setAlternativeEmail(metadata?.alternativeEmail || "");
            setCountry(metadata?.country || "");
            setTimezone(metadata?.timezone || detectTimezone() || "");
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
                <IconNotification
                    title="Error"
                    description="Failed to delete account. Please try again."
                    color="error"
                    onClose={() => toast.dismiss(t)}
                />
            ));
            setIsDeleting(false);
        }
    };

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center py-16">
                <p className="text-sm text-tertiary">Loading...</p>
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

                <hr className="h-px w-full border-none bg-border-secondary" />

                {/* Username */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                    <SectionLabel.Root size="sm" title="Username" className="max-lg:hidden" />

                    <InputGroup
                        size="md"
                        label="Username"
                        name="username"
                        className="lg:[&_[data-label]]:hidden"
                        leadingAddon={<InputGroup.Prefix>untitledui.com/</InputGroup.Prefix>}
                        isInvalid={!!fieldErrors.username}
                        value={username}
                        onChange={setUsername}
                    >
                        <InputBase />
                    </InputGroup>
                </div>

                <hr className="h-px w-full border-none bg-border-secondary" />

                {/* Website */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                    <SectionLabel.Root size="sm" title="Website" className="max-lg:hidden" />

                    <InputGroup
                        size="md"
                        label="Website"
                        name="website"
                        className="lg:[&_[data-label]]:hidden"
                        leadingAddon={<InputGroup.Prefix>https://</InputGroup.Prefix>}
                        value={website}
                        onChange={setWebsite}
                    >
                        <InputBase />
                    </InputGroup>
                </div>

                <hr className="h-px w-full border-none bg-border-secondary" />

                {/* Country */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                    <SectionLabel.Root size="sm" title="Country" className="max-lg:hidden" />

                    <Select
                        name="country"
                        label="Country"
                        size="md"
                        selectedKey={country || undefined}
                        onSelectionChange={(key) => setCountry(key as string)}
                        className="lg:label:hidden"
                        items={countriesOptions}
                    >
                        {(item) => (
                            <Select.Item id={item.id} icon={item.icon}>
                                {item.label}
                            </Select.Item>
                        )}
                    </Select>
                </div>

                <hr className="h-px w-full border-none bg-border-secondary" />

                {/* Timezone */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                    <SectionLabel.Root size="sm" title="Timezone" className="max-lg:hidden" />

                    <Select
                        name="timezone"
                        label="Timezone"
                        size="md"
                        selectedKey={timezone || undefined}
                        onSelectionChange={(key) => setTimezone(key as string)}
                        className="lg:label:hidden"
                        items={timezonesOptionsWithLongName}
                    >
                        {(item) => (
                            <Select.Item id={item.id} supportingText={item.supportingText}>
                                {item.label}
                            </Select.Item>
                        )}
                    </Select>
                </div>

                <hr className="h-px w-full border-none bg-border-secondary" />

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

                <hr className="h-px w-full border-none bg-border-secondary" />

                {/* Your bio */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                    <SectionLabel.Root size="sm" title="Your bio" description="Write a short introduction." tooltip="This will be public" />

                    <TextEditor.Root
                        limit={400}
                        className="gap-2"
                        inputClassName="min-h-57 md:min-h-43 p-4 resize-y"
                        content={bio}
                        onUpdate={({ editor }) => setBio(editor.getHTML())}
                    >
                        <TextEditor.Toolbar />

                        <div className="flex flex-col gap-1.5">
                            <TextEditor.Content />
                            <TextEditor.HintText />
                        </div>
                    </TextEditor.Root>
                </div>

                <hr className="h-px w-full border-none bg-border-secondary" />

                {/* Job title */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                    <SectionLabel.Root size="sm" title="Job title" className="max-lg:hidden" />

                    <div className="flex flex-col gap-4">
                        <TextField name="jobTitle" value={jobTitle} onChange={setJobTitle}>
                            <Label className="lg:hidden">Job title</Label>
                            <InputBase size="md" placeholder="e.g. Product Designer" />
                        </TextField>

                        <Checkbox label="Show my job title in my profile" isSelected={showJobTitle} onChange={setShowJobTitle} />
                    </div>
                </div>

                <hr className="h-px w-full border-none bg-border-secondary" />

                {/* Alternative contact email */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                    <SectionLabel.Root
                        size="sm"
                        title="Alternative contact email"
                        description="Enter an alternative email if you'd like to be contacted via a different email."
                    />

                    <TextField aria-label="Alternative contact email" name="alternativeEmail" type="email" value={alternativeEmail} onChange={setAlternativeEmail}>
                        <InputBase
                            size="md"
                            placeholder="you@example.com"
                            icon={Mail01}
                        />
                    </TextField>
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
            <hr className="h-px w-full border-none bg-border-secondary" />
            
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_minmax(400px,512px)] lg:gap-8">
                <SectionLabel.Root 
                    size="sm" 
                    title="Danger zone" 
                    description="Irreversible and destructive actions."
                    className="text-fg-error-primary"
                />

                <div className="flex flex-col gap-4 rounded-xl border border-border-error-subtle bg-bg-error-primary p-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-semibold text-fg-error-primary">Delete account</h3>
                        <p className="text-sm text-fg-error-secondary">
                            Once you delete your account, there is no going back. Please be certain.
                        </p>
                    </div>
                    <div>
                        <Button 
                            color="primary-destructive" 
                            size="sm" 
                            onClick={() => setIsDeleteModalOpen(true)}
                        >
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
                                <div className="flex w-full max-w-md flex-col gap-6 rounded-xl bg-primary p-6 shadow-xl">
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-lg font-semibold text-primary">Delete account</h2>
                                        <p className="text-sm text-tertiary">
                                            Are you sure you want to delete your account? This action cannot be undone.
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <TextField
                                            aria-label="Confirmation"
                                            isRequired
                                            value={deleteConfirmation}
                                            onChange={setDeleteConfirmation}
                                        >
                                            <Label>Type "DELETE" to confirm</Label>
                                            <InputBase
                                                size="md"
                                                placeholder="DELETE"
                                            />
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
