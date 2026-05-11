"use client";

import { useState } from "react";
import { Building07 } from "@untitledui/icons";
import { cx } from "@/utils/cx";

type InstitutionLogoProps = {
    /** Display name for accessible alt text when a logo is shown */
    institutionName?: string | null;
    /** Raw base64 payload from Plaid `institutions/get_by_id` (PNG) */
    logoBase64?: string | null;
    /** Hex color from Plaid institution metadata (e.g. `#0074C8`) */
    primaryColor?: string | null;
    /** When false, the avatar is visually de-emphasized (paused connection). */
    isActive?: boolean;
    /** Highlights connection issues (sync error). */
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
    sm: "text-[10px] leading-none",
    md: "text-xs leading-none",
    lg: "text-sm leading-none",
} as const;

const HEX6 = /^#?([0-9a-fA-F]{6})$/;

function normalizeHex(color: string | null | undefined): string | null {
    if (!color?.trim()) return null;
    const m = HEX6.exec(color.trim());
    if (!m) return null;
    return `#${m[1]}`;
}

function relativeLuminance(hex: string): number {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return 0.5;
    const n = parseInt(m[1], 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    const lin = (c: number) =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const R = lin(r);
    const G = lin(g);
    const B = lin(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastingTextColor(bgHex: string): string {
    return relativeLuminance(bgHex) > 0.55 ? "#111827" : "#ffffff";
}

/**
 * Derives 1–2 letter initials for banks / institutions (e.g. "Bank of America" → "BA").
 */
function institutionInitials(name: string): string {
    const cleaned = name.trim();
    if (!cleaned) return "?";
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const skip = new Set(["bank", "credit", "union", "national", "federal", "of", "the", "and", "inc", "na"]);
    const significant = parts.filter((w) => !skip.has(w.toLowerCase().replace(/[^a-z]/g, "")));
    const words = significant.length >= 2 ? significant : parts;
    if (words.length >= 2) {
        const a = words[0]?.charAt(0);
        const b = words[1]?.charAt(0);
        if (a && b) return `${a}${b}`.toUpperCase();
    }
    const w = words[0] ?? cleaned;
    return w.slice(0, 2).toUpperCase();
}

/**
 * Institution avatar: Plaid-provided logo when available; otherwise a branded monogram
 * using institution name and optional Plaid primary color.
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

    const label = institutionName?.trim() || "Financial institution";
    const initials = institutionInitials(label);
    const hex = normalizeHex(primaryColor ?? undefined);

    const shell = cx(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-xs transition-opacity duration-150",
        boxSize[size],
        hasError
            ? "ring-2 ring-error ring-offset-1 ring-offset-bg-primary"
            : "ring-1 ring-secondary ring-inset",
        !isActive && "opacity-60 grayscale",
        className,
    );

    const showImage = Boolean(logoBase64 && !imageFailed);

    if (showImage) {
        return (
            <div className={cx(shell, "bg-gray-100")}>
                <img
                    alt={label}
                    src={`data:image/png;base64,${logoBase64}`}
                    className="size-full object-contain"
                    onError={() => setImageFailed(true)}
                />
            </div>
        );
    }

    if (hex) {
        return (
            <div
                className={shell}
                style={{
                    backgroundColor: hex,
                    color: contrastingTextColor(hex),
                }}
            >
                <span className={cx("font-semibold tracking-tight", monogramText[size])} aria-hidden>
                    {initials}
                </span>
                <span className="sr-only">{label}</span>
            </div>
        );
    }

    if (initials !== "?") {
        return (
            <div className={cx(shell, "bg-secondary_subtle text-secondary")}>
                <span className={cx("font-semibold tracking-tight", monogramText[size])} aria-hidden>
                    {initials}
                </span>
                <span className="sr-only">{label}</span>
            </div>
        );
    }

    return (
        <div className={cx(shell, "bg-gray-100")}>
            <Building07 className={cx("text-gray-500", iconSize[size])} aria-hidden />
            <span className="sr-only">{label}</span>
        </div>
    );
}
