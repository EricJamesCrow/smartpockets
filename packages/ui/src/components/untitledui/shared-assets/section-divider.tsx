"use client";

import { cx } from "../../../utils/cx";

interface SectionDividerProps {
    className?: string;
    variant?: "default" | "gradient" | "subtle";
}

export const SectionDivider = ({ className, variant = "default" }: SectionDividerProps) => {
    const variantClasses = {
        default: "border-t border-secondary",
        gradient: "h-px bg-gradient-to-r from-transparent via-border-secondary to-transparent",
        subtle: "h-px bg-gradient-to-r from-transparent via-border-tertiary to-transparent",
    };

    return (
        <div className={cx("mx-auto w-full max-w-container px-4 md:px-8", className)}>
            <div className={variantClasses[variant]} />
        </div>
    );
};
