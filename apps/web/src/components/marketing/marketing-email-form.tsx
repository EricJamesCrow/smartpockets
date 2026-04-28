"use client";

import type { FormEvent } from "react";
import { ArrowRight } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { cx } from "@repo/ui/utils";

interface MarketingEmailFormProps {
    /** Stable id prefix; produces `${idPrefix}-email`, `${idPrefix}-submit`, `${idPrefix}-hint`. */
    idPrefix: string;
    /** Layout variant — `inline` is the default side-by-side hero shape, `stacked` keeps a tighter footprint for narrow CTAs. */
    variant?: "inline" | "stacked";
    submitLabel?: string;
    placeholder?: string;
    hint?: string;
    className?: string;
}

const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.currentTarget.reset();
};

/**
 * Prototype waitlist form. Submission resets the form — it does not
 * persist the email anywhere yet. The IDs are deterministic via `idPrefix`
 * so we can reuse the component multiple times on the same page without
 * colliding label/aria-describedby relationships.
 */
export const MarketingEmailForm = ({
    idPrefix,
    variant = "inline",
    submitLabel = "Request access",
    placeholder = "you@example.com",
    hint = "Prototype form. Email capture is not active yet.",
    className,
}: MarketingEmailFormProps) => {
    const emailId = `${idPrefix}-email`;
    const submitId = `${idPrefix}-submit`;
    const hintId = `${idPrefix}-hint`;

    return (
        <div className={cx("w-full", className)}>
            <Form
                onSubmit={handleSubmit}
                className={cx(
                    "flex w-full flex-col gap-2.5",
                    variant === "inline" ? "md:max-w-xl md:flex-row md:gap-2" : "sm:flex-row sm:gap-2",
                )}
            >
                <Input
                    id={emailId}
                    aria-label="Email address"
                    aria-describedby={hintId}
                    isRequired
                    size="md"
                    name="email"
                    type="email"
                    autoComplete="email"
                    spellCheck="false"
                    placeholder={placeholder}
                    wrapperClassName="min-h-12 flex-1 rounded-full border border-white/10 bg-white/[0.05] px-1.5 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus-within:border-brand-300/40 focus-within:ring-2 focus-within:ring-brand-300/30"
                    inputClassName="text-white placeholder:text-gray-500 placeholder:font-normal"
                />
                <Button
                    id={submitId}
                    type="submit"
                    size="xl"
                    iconTrailing={ArrowRight}
                    className="min-h-12 rounded-full bg-white px-5 text-[0.9rem] font-semibold text-gray-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_4px_16px_rgba(34,211,141,0.22)] ring-white/20 transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-50 active:scale-[0.97]"
                >
                    {submitLabel}
                </Button>
            </Form>
            <p id={hintId} className="mt-2.5 text-xs leading-5 text-gray-500">
                {hint}
            </p>
        </div>
    );
};
