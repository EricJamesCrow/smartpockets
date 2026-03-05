"use client";

import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { CreditCard02 } from "@untitledui/icons";
import type { DetailPanelTransaction } from "./TransactionDetailPanel";

interface TransactionDetailSourceCardProps {
  sourceInfo: NonNullable<DetailPanelTransaction["sourceInfo"]>;
}

/**
 * Source card section showing which card a transaction belongs to.
 * Links to the card detail page.
 */
export function TransactionDetailSourceCard({
  sourceInfo,
}: TransactionDetailSourceCardProps) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
        Source Card
      </label>
      <div className="mt-2 flex items-center gap-3 rounded-lg border border-secondary p-3">
        <CreditCard02 className="size-5 shrink-0 text-tertiary" />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-primary">
            {sourceInfo.displayName}
          </p>
          {sourceInfo.lastFour && (
            <p className="text-xs text-tertiary">
              ••{sourceInfo.lastFour}
            </p>
          )}
        </div>
        <Button
          color="secondary"
          size="sm"
          href={`/credit-cards/${sourceInfo.cardId}`}
        >
          View card
        </Button>
      </div>
    </div>
  );
}
