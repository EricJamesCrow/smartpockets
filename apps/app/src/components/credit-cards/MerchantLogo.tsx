"use client";

import { cx } from "@repo/ui/utils";

interface MerchantLogoProps {
  logoUrl?: string;
  merchantName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
};

const textSizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

/**
 * Merchant logo component with fallback to initials
 *
 * Displays the merchant logo if available, otherwise shows
 * the first two letters of the merchant name as a fallback.
 */
export function MerchantLogo({
  logoUrl,
  merchantName,
  size = "sm",
  className,
}: MerchantLogoProps) {
  const initials = merchantName.substring(0, 2).toUpperCase();

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={merchantName}
        className={cx(
          sizeClasses[size],
          "rounded-full object-cover",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cx(
        sizeClasses[size],
        "flex items-center justify-center rounded-full bg-tertiary",
        className
      )}
    >
      <span className={cx(textSizes[size], "font-semibold text-primary")}>
        {initials}
      </span>
    </div>
  );
}
