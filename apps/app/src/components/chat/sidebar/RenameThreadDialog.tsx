"use client";

import { useState } from "react";
import { Check, XClose } from "@untitledui/icons";
import { ButtonUtility } from "@repo/ui/untitledui/base/buttons/button-utility";
import { InputBase, TextField } from "@repo/ui/untitledui/base/input/input";

interface RenameThreadDialogProps {
    currentTitle: string;
    onConfirm: (newTitle: string) => Promise<void>;
    onCancel: () => void;
}

/**
 * Inline-edit form that replaces the chat history Link while editing.
 * Renders inside the same <li> as a normal ChatHistoryItem so the layout
 * stays steady. Submit on Enter / save button; cancel on Escape / X button.
 *
 * CROWDEV-343 (PR #162 codex P1): primitives are UntitledUI Pro
 * (`InputBase`/`TextField` + `ButtonUtility`) so the form stays consistent
 * with the rest of the app's input/button styling, focus rings, and dark-
 * mode treatment. The inline pattern (icon-only save + cancel beside the
 * input) mirrors what's used in settings and the appearance picker.
 */
export function RenameThreadDialog({ currentTitle, onConfirm, onCancel }: RenameThreadDialogProps) {
    const [value, setValue] = useState(currentTitle);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed || trimmed === currentTitle) {
            onCancel();
            return;
        }
        setSubmitting(true);
        try {
            await onConfirm(trimmed);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-1 rounded-md px-1 py-0.5">
            <TextField
                aria-label="Rename conversation"
                value={value}
                onChange={setValue}
                isDisabled={submitting}
                maxLength={120}
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        e.preventDefault();
                        onCancel();
                    }
                }}
                className="flex-1 min-w-0"
            >
                <InputBase size="sm" />
            </TextField>
            <ButtonUtility
                type="submit"
                tooltip="Save"
                isDisabled={submitting}
                icon={Check}
                color="secondary"
                size="xs"
            />
            <ButtonUtility
                type="button"
                tooltip="Cancel"
                onClick={onCancel}
                isDisabled={submitting}
                icon={XClose}
                color="tertiary"
                size="xs"
            />
        </form>
    );
}
