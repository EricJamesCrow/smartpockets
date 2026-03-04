"use client";

import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Tooltip } from "@repo/ui/untitledui/base/tooltip/tooltip";
import { Check, Eye, EyeOff } from "@untitledui/icons";

interface TransactionDetailHeaderProps {
  isReviewed: boolean;
  isHidden: boolean;
  savingField: string | null;
  onToggleReviewed: () => void;
  onToggleHidden: () => void;
  onClose: () => void;
}

/**
 * Header bar for the transaction detail panel.
 *
 * Left side: "Mark as reviewed" toggle + hide/show toggle.
 * Right side: Close button (handled by SlideoutMenu.Header onClose).
 */
export function TransactionDetailHeader({
  isReviewed,
  isHidden,
  savingField,
  onToggleReviewed,
  onToggleHidden,
  onClose,
}: TransactionDetailHeaderProps) {
  return (
    <div className="flex items-center gap-2 pr-10">
      <Button
        color={isReviewed ? "primary" : "secondary"}
        size="sm"
        iconLeading={Check}
        isLoading={savingField === "isReviewed"}
        onClick={onToggleReviewed}
      >
        {isReviewed ? "Reviewed" : "Mark as reviewed"}
      </Button>

      <Tooltip
        title={
          isHidden
            ? "Transaction is hidden. Click to unhide."
            : "Hide this transaction from reports and totals"
        }
      >
        <Button
          color="tertiary"
          size="sm"
          iconLeading={isHidden ? EyeOff : Eye}
          isLoading={savingField === "isHidden"}
          onClick={onToggleHidden}
          aria-label={isHidden ? "Show transaction" : "Hide transaction"}
        />
      </Tooltip>
    </div>
  );
}
