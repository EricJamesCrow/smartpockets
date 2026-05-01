"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { cx } from "@/utils/cx";

interface UserAvatarProps {
    size?: "sm" | "md";
    className?: string;
}

function getInitials(name: string | undefined | null): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps["size"]>, string> = {
    sm: "size-8 text-xs",
    md: "size-10 text-xs",
};

export function UserAvatar({ size = "md", className }: UserAvatarProps) {
    const { user } = useUser();
    const [imageError, setImageError] = useState(false);
    const showImage = Boolean(user?.imageUrl) && !imageError;

    const initials = getInitials(
        user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress,
    );

    return (
        <div
            className={cx(
                "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-solid font-semibold text-white",
                SIZE_CLASSES[size],
                className,
            )}
            aria-hidden
        >
            {showImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={user!.imageUrl}
                    alt=""
                    className="size-full object-cover"
                    onError={() => setImageError(true)}
                />
            ) : (
                initials
            )}
        </div>
    );
}
