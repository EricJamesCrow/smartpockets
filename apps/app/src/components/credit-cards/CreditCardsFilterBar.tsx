"use client";

import { XClose } from "@untitledui/icons";
import { Select, type SelectItemType } from "@repo/ui/untitledui/base/select/select";
import { SelectItem } from "@repo/ui/untitledui/base/select/select-item";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { Toggle } from "@repo/ui/untitledui/base/toggle/toggle";
import { cx } from "@repo/ui/utils";
import {
  type CardFilters,
  type BrandFilter,
  type CardStatusFilter,
  type PaymentDueFilter,
  type UtilizationFilter,
  type SortOption,
  DEFAULT_CARD_FILTERS,
} from "@/types/credit-cards";
import {
  hasActiveFilters,
  getActiveFilterDescriptions,
} from "@/hooks/useCardFiltering";

// =============================================================================
// FILTER OPTIONS
// =============================================================================

const brandOptions: SelectItemType[] = [
  { id: "all", label: "All Brands" },
  { id: "visa", label: "Visa" },
  { id: "mastercard", label: "Mastercard" },
  { id: "amex", label: "Amex" },
  { id: "discover", label: "Discover" },
];

const statusOptions: SelectItemType[] = [
  { id: "all", label: "All Status" },
  { id: "active", label: "Active" },
  { id: "locked", label: "Locked" },
  { id: "inactive", label: "Inactive" },
];

const paymentDueOptions: SelectItemType[] = [
  { id: "all", label: "All Payments" },
  { id: "due_7_days", label: "Due in 7 days" },
  { id: "due_14_days", label: "Due in 14 days" },
  { id: "overdue", label: "Overdue" },
];

const utilizationOptions: SelectItemType[] = [
  { id: "all", label: "All Utilization" },
  { id: "low", label: "Low (<30%)" },
  { id: "medium", label: "Medium (30-70%)" },
  { id: "high", label: "High (>70%)" },
];

const sortOptions: SelectItemType[] = [
  { id: "cardName", label: "Name (A-Z)" },
  { id: "company", label: "Company (A-Z)" },
  { id: "payment_due", label: "Payment Due" },
  { id: "current_balance", label: "Balance (High)" },
  { id: "available_credit", label: "Available (High)" },
  { id: "utilization_desc", label: "Utilization (High)" },
  { id: "utilization_asc", label: "Utilization (Low)" },
  { id: "apr_asc", label: "APR (Low)" },
  { id: "apr_desc", label: "APR (High)" },
];

// =============================================================================
// COMPONENT
// =============================================================================

interface CreditCardsFilterBarProps {
  /** Current filter state */
  filters: CardFilters;
  /** Callback when any filter changes */
  onFiltersChange: (filters: CardFilters) => void;
  /** Total card count (before filtering) */
  totalCount?: number;
  /** Filtered card count */
  filteredCount?: number;
  /** Whether extended view is enabled */
  isExtended?: boolean;
  /** Callback to toggle extended view */
  onExtendedChange?: (value: boolean) => void;
  /** Active wallet filter name (if any) */
  walletName?: string;
  /** Callback to clear wallet filter */
  onClearWallet?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Filter bar component for credit cards
 *
 * Includes:
 * - Brand filter
 * - Status filter (Active/Locked/Inactive)
 * - Payment due filter (7 days/14 days/Overdue)
 * - Utilization filter (Low/Medium/High)
 * - Extended sort options
 * - View toggle for extended/compact mode
 */
export function CreditCardsFilterBar({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
  isExtended = false,
  onExtendedChange,
  walletName,
  onClearWallet,
  className,
}: CreditCardsFilterBarProps) {
  const updateFilter = <K extends keyof CardFilters>(
    key: K,
    value: CardFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      ...DEFAULT_CARD_FILTERS,
      sortBy: filters.sortBy, // Keep sort preference
    });
  };

  const activeFilters = hasActiveFilters(filters);
  const filterDescriptions = getActiveFilterDescriptions(filters);

  return (
    <div className={cx("border-b border-secondary", className)}>
      {/* Main Filter Row */}
      <div className="px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Left: Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Brand Filter */}
            <Select
              size="sm"
              items={brandOptions}
              selectedKey={filters.brand}
              onSelectionChange={(key) =>
                updateFilter("brand", key as BrandFilter)
              }
              placeholder="Brand"
            >
              {(item) => <SelectItem id={item.id}>{item.label}</SelectItem>}
            </Select>

            {/* Status Filter */}
            <Select
              size="sm"
              items={statusOptions}
              selectedKey={filters.status}
              onSelectionChange={(key) =>
                updateFilter("status", key as CardStatusFilter)
              }
              placeholder="Status"
            >
              {(item) => <SelectItem id={item.id}>{item.label}</SelectItem>}
            </Select>

            {/* Payment Due Filter */}
            <Select
              size="sm"
              items={paymentDueOptions}
              selectedKey={filters.paymentDue}
              onSelectionChange={(key) =>
                updateFilter("paymentDue", key as PaymentDueFilter)
              }
              placeholder="Payment"
            >
              {(item) => <SelectItem id={item.id}>{item.label}</SelectItem>}
            </Select>

            {/* Utilization Filter */}
            <Select
              size="sm"
              items={utilizationOptions}
              selectedKey={filters.utilization}
              onSelectionChange={(key) =>
                updateFilter("utilization", key as UtilizationFilter)
              }
              placeholder="Utilization"
            >
              {(item) => <SelectItem id={item.id}>{item.label}</SelectItem>}
            </Select>
          </div>

          {/* Separator */}
          <div className="hidden h-6 w-px bg-secondary md:block" />

          {/* Sort */}
          <Select
            size="sm"
            items={sortOptions}
            selectedKey={filters.sortBy}
            onSelectionChange={(key) => updateFilter("sortBy", key as SortOption)}
            placeholder="Sort by"
          >
            {(item) => <SelectItem id={item.id}>{item.label}</SelectItem>}
          </Select>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: View Toggle & Count */}
          <div className="flex items-center gap-3">
            {/* Card Count */}
            {totalCount !== undefined && filteredCount !== undefined && (
              <span className="text-xs tabular-nums text-tertiary">
                {filteredCount === totalCount
                  ? `${totalCount} cards`
                  : `${filteredCount} of ${totalCount}`}
              </span>
            )}

            {/* View Toggle */}
            {onExtendedChange && (
              <>
                <div className="h-6 w-px bg-secondary" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-tertiary">Details</span>
                  <Toggle
                    isSelected={isExtended}
                    onChange={onExtendedChange}
                    size="sm"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Filter Indicator */}
      {walletName && (
        <div className="flex items-center gap-2 border-t border-secondary bg-utility-brand-50 px-4 py-2 md:px-6">
          <span className="text-xs text-tertiary">Viewing:</span>
          <Badge type="color" color="brand" size="sm">
            <span className="flex items-center gap-1">
              {walletName}
              {onClearWallet && (
                <button
                  onClick={onClearWallet}
                  className="ml-1 rounded-full p-0.5 hover:bg-utility-brand-100"
                  aria-label="Clear wallet filter"
                >
                  <XClose className="h-3 w-3" />
                </button>
              )}
            </span>
          </Badge>
        </div>
      )}

      {/* Active Filters Row */}
      {activeFilters && (
        <div className="flex items-center gap-2 border-t border-secondary bg-secondary/30 px-4 py-2 md:px-6">
          <span className="text-xs text-tertiary">Active:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {filterDescriptions.map((desc) => (
              <Badge key={desc} type="modern" color="gray" size="sm">
                {desc}
              </Badge>
            ))}
          </div>
          <Button
            color="tertiary"
            size="sm"
            iconLeading={XClose}
            onClick={clearFilters}
            className="ml-auto"
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
