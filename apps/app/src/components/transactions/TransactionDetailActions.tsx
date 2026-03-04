"use client";

import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { EyeOff, Eye } from "@untitledui/icons";

interface TransactionDetailActionsProps {
  isHidden: boolean;
  savingField: string | null;
  onToggleHidden: () => void;
}

/**
 * "Other Options" section at the bottom of the detail panel.
 *
 * Currently contains the hide/unhide action with a destructive style.
 */
export function TransactionDetailActions({
  isHidden,
  savingField,
  onToggleHidden,
}: TransactionDetailActionsProps) {
  return (
    <div className="border-t border-secondary pt-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-tertiary">
        Other Options
      </p>

      <Button
        color={isHidden ? "secondary" : "secondary-destructive"}
        size="sm"
        iconLeading={isHidden ? Eye : EyeOff}
        isLoading={savingField === "isHidden"}
        onClick={onToggleHidden}
      >
        {isHidden ? "Unhide transaction" : "Hide transaction"}
      </Button>

      <p className="mt-2 text-xs text-quaternary">
        {isHidden
          ? "This transaction is hidden from your feed. Unhide it to include it in reports and totals."
          : "Hidden transactions are excluded from reports and totals. You can unhide them at any time."}
      </p>
    </div>
  );
}
