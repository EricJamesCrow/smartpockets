"use client";

import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { EyeOff } from "@untitledui/icons";

interface TransactionDetailActionsProps {
  onHide: () => void;
  isHiding: boolean;
}

/**
 * "Other Options" section with hide transaction action.
 */
export function TransactionDetailActions({
  onHide,
  isHiding,
}: TransactionDetailActionsProps) {
  return (
    <div className="border-t border-secondary pt-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-tertiary">
        Other Options
      </p>

      <Button
        color="secondary-destructive"
        size="sm"
        iconLeading={EyeOff}
        onClick={onHide}
        isDisabled={isHiding}
      >
        Hide transaction
      </Button>

      <p className="mt-2 text-xs text-quaternary">
        Hide this transaction from all views. You can undo this action for a few
        seconds after hiding.
      </p>
    </div>
  );
}
