"use client";

import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Trash01 } from "@untitledui/icons";

/**
 * "Other Options" section at the bottom of the detail panel.
 *
 * Contains a disabled "Delete transaction" action (deletion not yet supported).
 */
export function TransactionDetailActions() {
  return (
    <div className="border-t border-secondary pt-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-tertiary">
        Other Options
      </p>

      <Button
        color="secondary-destructive"
        size="sm"
        iconLeading={Trash01}
        isDisabled
      >
        Delete transaction
      </Button>

      <p className="mt-2 text-xs text-quaternary">
        Permanently delete this transaction. This feature is coming soon.
      </p>
    </div>
  );
}
