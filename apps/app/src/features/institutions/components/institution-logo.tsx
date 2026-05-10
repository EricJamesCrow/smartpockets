"use client";

import { Building07 } from "@untitledui/icons";
import { cx } from "@/utils/cx";

type InstitutionLogoProps = {
    /** Display name for accessible alt text when a logo is shown */
    institutionName?: string | null;
    /** Raw base64 payload from Plaid `institutions/get_by_id` (PNG) */
    logoBase64?: string | null;
    size?: "sm" | "md" | "lg";
    className?: string;
};

const boxSize = {
    sm: "size-10",
    md: "size-12",
    lg: "size-14",
} as const;

const iconSize = {
    sm: "size-5",
    md: "size-6",
    lg: "size-7",
} as const;

/**
 * Institution avatar: Plaid-provided logo when available, otherwise the standard building icon.
 */
export function InstitutionLogo({
    institutionName,
    logoBase64,
    size = "md",
    className,
}: InstitutionLogoProps) {
    const shell = cx(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 shadow-xs ring-1 ring-secondary ring-inset",
        boxSize[size],
        className,
    );

    const label = institutionName?.trim() || "Financial institution";

    if (logoBase64) {
        return (
            <div className={shell}>
                <img
                    alt={label}
                    src={`data:image/png;base64,${logoBase64}`}
                    className="size-full object-contain"
                />
            </div>
        );
    }

    return (
        <div className={shell}>
            <Building07 className={cx("text-gray-500", iconSize[size])} aria-hidden />
        </div>
    );
}
