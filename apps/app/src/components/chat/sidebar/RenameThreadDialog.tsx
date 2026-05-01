"use client";

import { useState } from "react";
import { Check, XClose } from "@untitledui/icons";

interface RenameThreadDialogProps {
    currentTitle: string;
    onConfirm: (newTitle: string) => Promise<void>;
    onCancel: () => void;
}

/**
 * Inline-edit form that replaces the chat history Link while editing.
 * Renders inside the same <li> as a normal ChatHistoryItem so the layout
 * stays steady. Submit on Enter / save button; cancel on Escape / X button.
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
            <input
                type="text"
                aria-label="Rename conversation"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        e.preventDefault();
                        onCancel();
                    }
                }}
                className="flex-1 min-w-0 rounded border border-secondary bg-primary px-2 py-1 text-sm text-primary outline-none focus:border-[var(--sp-moss-mint)]/50"
                disabled={submitting}
                maxLength={120}
            />
            <button
                type="submit"
                aria-label="Save"
                disabled={submitting}
                className="shrink-0 rounded p-1 text-[var(--sp-moss-mint)] hover:bg-secondary disabled:opacity-50"
            >
                <Check className="size-4" />
            </button>
            <button
                type="button"
                aria-label="Cancel"
                onClick={onCancel}
                disabled={submitting}
                className="shrink-0 rounded p-1 text-tertiary hover:bg-secondary disabled:opacity-50"
            >
                <XClose className="size-4" />
            </button>
        </form>
    );
}
