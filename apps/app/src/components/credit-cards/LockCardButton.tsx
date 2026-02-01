"use client";

import { Lock01, LockUnlocked01, Loading02 } from "@untitledui/icons";
import { Tooltip } from "@repo/ui/untitledui/base/tooltip/tooltip";
import { cx } from "@/utils/cx";

interface LockCardButtonProps {
  isLocked: boolean;
  onClick: () => void;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Button to toggle card lock state
 *
 * Note: This button marks a card as "locked" within SmartPockets for
 * organizational purposes only. It does NOT lock the actual credit card -
 * users must contact their card issuer to freeze/lock their physical card.
 */
export function LockCardButton({
  isLocked,
  onClick,
  isLoading = false,
  size = "md",
  className,
}: LockCardButtonProps) {
  const Icon = isLoading ? Loading02 : isLocked ? Lock01 : LockUnlocked01;
  const label = isLocked ? "Unlock card" : "Lock card";

  return (
    <Tooltip title={label} delay={300}>
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className={cx(
          "relative flex items-center justify-center rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-utility-brand-500 focus:ring-offset-2",
          size === "sm" ? "size-9" : "size-10",
          isLoading && "cursor-not-allowed opacity-70",
          isLocked
            ? "border-utility-brand-200 bg-utility-brand-50 text-utility-brand-600 hover:bg-utility-brand-100 hover:text-utility-brand-700 hover:border-utility-brand-300"
            : "border-secondary bg-white text-tertiary hover:bg-gray-50 hover:text-primary hover:border-secondary_hover",
          className
        )}
        aria-label={label}
      >
        <Icon className={cx("size-5 transition-transform duration-200", isLocked && "scale-90", size === "sm" && "size-4", isLoading && "animate-spin")} />
        {isLocked && !isLoading && (
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-utility-brand-600 ring-2 ring-white" />
        )}
      </button>
    </Tooltip>
  );
}
