"use client";

import { Avatar } from "@repo/ui/untitledui/base/avatar/avatar";
import { ChaseMark } from "@/components/credit-cards/primitives/bank-logos";
import { cx } from "@repo/ui/utils";

interface TransactionSourceCellProps {
  displayName: string;
  lastFour?: string;
  institutionName?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Renders the source (credit card) info for a transaction
 *
 * Shows institution logo or fallback avatar, plus card display name and last 4 digits.
 */
export function TransactionSourceCell({
  displayName,
  lastFour,
  institutionName,
  size = "sm",
  className,
}: TransactionSourceCellProps) {
  const logoSize = size === "sm" ? "size-8" : "size-10";

  // Determine which logo to show based on institution name
  const renderLogo = () => {
    const institution = institutionName?.toLowerCase() ?? "";

    // Chase Bank
    if (institution.includes("chase")) {
      return (
        <div
          className={cx(
            logoSize,
            "flex items-center justify-center rounded-lg bg-[#117ACA]"
          )}
        >
          <ChaseMark className="size-5 text-white" />
        </div>
      );
    }

    // Default: Use Avatar with first letter
    const initial = displayName.charAt(0).toUpperCase();
    return <Avatar size={size} initials={initial} />;
  };

  return (
    <div className={cx("flex items-center gap-2", className)}>
      {renderLogo()}
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-primary truncate">
          {displayName}
        </span>
        {lastFour && (
          <span className="text-xs text-tertiary">
            ****{lastFour}
          </span>
        )}
      </div>
    </div>
  );
}
