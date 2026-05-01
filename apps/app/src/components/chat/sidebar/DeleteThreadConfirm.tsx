"use client";

import { useState } from "react";
import { Heading as AriaHeading, DialogTrigger as AriaDialogTrigger } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@repo/ui/untitledui/application/modals/modal";
import { Button } from "@repo/ui/untitledui/base/buttons/button";

interface DeleteThreadConfirmProps {
    open: boolean;
    threadTitle: string;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}

/**
 * Confirmation dialog for deleting a chat thread.
 * Uses UntitledUI Pro's Modal/Dialog primitives (React Aria-based) to keep
 * focus management, dismiss-on-Escape, and outside-click semantics consistent
 * with the rest of the app. Soft-delete on the backend (sets isArchived: true).
 */
export function DeleteThreadConfirm({ open, threadTitle, onConfirm, onCancel }: DeleteThreadConfirmProps) {
    const [deleting, setDeleting] = useState(false);

    const handleConfirm = async () => {
        setDeleting(true);
        try {
            await onConfirm();
        } finally {
            setDeleting(false);
        }
    };

    return (
        <AriaDialogTrigger isOpen={open} onOpenChange={(o) => { if (!o && !deleting) onCancel(); }}>
            <ModalOverlay isDismissable={!deleting}>
                <Modal>
                    <Dialog>
                        <div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl sm:max-w-100">
                            <div className="flex flex-col gap-1.5 px-4 pt-5 pb-2 sm:px-6 sm:pt-6">
                                <AriaHeading slot="title" className="text-md font-semibold text-primary">
                                    Delete this conversation?
                                </AriaHeading>
                                <p className="text-sm text-tertiary">
                                    "{threadTitle}" will be permanently removed from your sidebar. This cannot be undone.
                                </p>
                            </div>
                            <div className="flex flex-col-reverse gap-3 p-4 pt-4 sm:flex-row sm:justify-end sm:px-6 sm:pt-6 sm:pb-6">
                                <Button color="secondary" size="md" onClick={onCancel} isDisabled={deleting}>
                                    Cancel
                                </Button>
                                <Button color="primary-destructive" size="md" onClick={handleConfirm} isDisabled={deleting}>
                                    {deleting ? "Deleting…" : "Delete"}
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </AriaDialogTrigger>
    );
}
