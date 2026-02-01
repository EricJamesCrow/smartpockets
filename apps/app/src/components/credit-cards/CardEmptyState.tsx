"use client";

import { CreditCard01 } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";

interface CardEmptyStateProps {
  onAddCard?: () => void;
}

/**
 * Empty state component for when no credit cards exist
 */
export function CardEmptyState({ onAddCard }: CardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Icon container */}
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-50 ring-8 ring-brand-25">
        <CreditCard01 className="size-7 text-brand-600" />
      </div>

      {/* Title */}
      <h3 className="mb-1 text-lg font-semibold text-primary">
        No credit cards yet
      </h3>

      {/* Description */}
      <p className="mb-6 max-w-sm text-sm text-tertiary">
        Add your credit cards to track balances, due dates, and utilization all
        in one place.
      </p>

      {/* Action button */}
      {onAddCard && (
        <Button color="primary" size="md" onClick={onAddCard}>
          Add your first card
        </Button>
      )}
    </div>
  );
}

/**
 * Empty state for filtered results
 */
export function FilteredEmptyState({
  onClearFilters,
}: {
  onClearFilters?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-gray-100">
        <CreditCard01 className="size-6 text-gray-400" />
      </div>

      <h3 className="mb-1 text-base font-semibold text-primary">
        No cards match your filters
      </h3>

      <p className="mb-4 max-w-sm text-sm text-tertiary">
        Try adjusting your filter criteria to see more results.
      </p>

      {onClearFilters && (
        <Button color="secondary" size="sm" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
