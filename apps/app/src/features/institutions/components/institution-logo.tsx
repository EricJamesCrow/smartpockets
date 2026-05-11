"use client";

import { useEffect, useState } from "react";
import { Building07 } from "@untitledui/icons";
import { cx } from "@/utils/cx";

type InstitutionLogoProps = {
    /** Display name for accessible alt text when a logo is shown */
    institutionName?: string | null;
    /** Raw base64 payload from Plaid `institutions/get_by_id` (PNG) */
    logoBase64?: string | null;
    /** Plaid institution primary color (hex), used for monogram fallback */
    primaryColor?: string | null;
    /** When false, the avatar is visually de-emphasized (paused institution). */
    isActive?: boolean;
    /** When true, show an error ring (sync / connection error). */
    hasError?: boolean;
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

const monogramText = {
    sm: "text-xs font-semibold",
    md: "text-sm font-semibold",
    lg: "text-base font-semibold",
} as const;

function parseHexColor(input: string | null | undefined): { r: number; g: number; b: number } | null {
    if (!input) return null;
    let s = input.trim();
    if (s.startsWith("#")) s = s.slice(1);
    if (s.length === 3) {
        s = s
            .split("")
            .map((c) => c + c)
            .join("");
    }
    if (s.length !== 6 || !/^[0-9a-fA-F]+$/.test(s)) return null;
    const n = Number.parseInt(s, 16);
    if (Number.isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
    const linear = (c: number) => {
        const x = c / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    const r = linear(rgb.r);
    const g = linear(rgb.g);
    const b = linear(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastingTextClass(hex: string): string {
    const rgb = parseHexColor(hex);
    if (!rgb) return "text-primary";
    return relativeLuminance(rgb) > 0.55 ? "text-gray-900" : "text-white";
}

function initialsFromInstitutionName(name: string | null | undefined): string | null {
    const chars = (name ?? "").match(/[A-Za-z0-9]/g);
    if (!chars || chars.length === 0) return null;
    return (chars[0] + (chars[1] ?? "")).toUpperCase();
}

/**
 * Institution avatar: Plaid PNG when available and decodable, else monogram on
 * Plaid primary color, else neutral monogram, else building icon.
 */
export function InstitutionLogo({
    institutionName,
    logoBase64,
    primaryColor,
    isActive = true,
    hasError = false,
    size = "md",
    className,
}: InstitutionLogoProps) {
    const [imageFailed, setImageFailed] = useState(false);
    const trimmedLogo = logoBase64?.trim();
    const showImage = Boolean(trimmedLogo) && !imageFailed;

    useEffect(() => {
        setImageFailed(false);
    }, [trimmedLogo]);

    const label = institutionName?.trim() || "Financial institution";
    const initials = initialsFromInstitutionName(institutionName);
    const plaidHex = parseHexColor(primaryColor ?? undefined);
    const canUsePlaidColorMonogram = Boolean(plaidHex && initials);

    const shell = cx(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-xs ring-inset",
        boxSize[size],
        hasError ? "ring-2 ring-error-primary" : "ring-1 ring-secondary",
        !isActive && "opacity-60 grayscale",
        className,
    );

    if (showImage) {
        return (
            <div className={cx(shell, "bg-primary")}>
                <img
                    alt={label}
                    src={`data:image/png;base64,${trimmedLogo}`}
                    className="size-full object-contain p-0.5"
                    onError={() => setImageFailed(true)}
                />
            </div>
        );
    }

    if (canUsePlaidColorMonogram && primaryColor) {
        return (
            <div
                className={cx(shell, contrastingTextClass(primaryColor))}
                style={{ backgroundColor: primaryColor }}
                aria-label={label}
                role="img"
            >
                <span className={monogramText[size]}>{initials}</span>
            </div>
        );
    }

    if (initials) {
        return (
            <div
                className={cx(
                    shell,
                    "bg-secondary_subtle text-secondary",
                    monogramText[size],
                )}
                aria-label={label}
                role="img"
            >
                {initials}
            </div>
        );
    }

    return (
        <div className={cx(shell, "bg-secondary_subtle")}>
            <Building07 className={cx("text-quaternary", iconSize[size])} aria-hidden />
        </div>
    );
}
