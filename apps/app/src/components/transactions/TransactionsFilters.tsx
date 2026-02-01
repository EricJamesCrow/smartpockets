"use client";

import { useState, type Key } from "react";
import type { DateValue } from "react-aria-components";
import type { RangeValue } from "@react-types/shared";
import type { Id } from "@convex/_generated/dataModel";
import { SearchMd, FilterLines, XClose } from "@untitledui/icons";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { Select } from "@repo/ui/untitledui/base/select/select";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { DateRangePicker } from "@repo/ui/untitledui/application/date-picker/date-range-picker";
import { TRANSACTION_CATEGORIES } from "@/types/credit-cards";

// =============================================================================
// TYPES
// =============================================================================

export interface TransactionsFiltersState {
  searchQuery: string;
  category: string;
  status: string;
  dateRange: RangeValue<DateValue> | null;
  cardIds: Id<"creditCards">[];
  amountMin?: number;
  amountMax?: number;
}

export const defaultTransactionsFilters: TransactionsFiltersState = {
  searchQuery: "",
  category: "all",
  status: "all",
  dateRange: null,
  cardIds: [],
  amountMin: undefined,
  amountMax: undefined,
};

interface CardOption {
  id: string;
  label: string;
  lastFour?: string;
}

interface TransactionsFiltersProps {
  filters: TransactionsFiltersState;
  onFiltersChange: (filters: TransactionsFiltersState) => void;
  cardOptions?: CardOption[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const categoryItems = [
  { id: "all", label: "All Categories" },
  ...TRANSACTION_CATEGORIES.map((cat) => ({ id: cat, label: cat })),
];

const statusItems = [
  { id: "all", label: "All Status" },
  { id: "posted", label: "Posted" },
  { id: "pending", label: "Pending" },
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Expandable transaction filters component
 *
 * Always shows search input. Clicking "Filters" expands to show
 * additional filter options: date range, category, source, status, amount range.
 */
export function TransactionsFilters({
  filters,
  onFiltersChange,
  cardOptions = [],
}: TransactionsFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if any filters are active (besides search)
  const hasActiveFilters =
    filters.category !== "all" ||
    filters.status !== "all" ||
    filters.dateRange !== null ||
    filters.cardIds.length > 0 ||
    filters.amountMin !== undefined ||
    filters.amountMax !== undefined;

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchQuery: value });
  };

  const handleCategoryChange = (key: Key | null) => {
    if (key !== null) {
      onFiltersChange({ ...filters, category: key as string });
    }
  };

  const handleStatusChange = (key: Key | null) => {
    if (key !== null) {
      onFiltersChange({ ...filters, status: key as string });
    }
  };

  const handleDateRangeChange = (range: RangeValue<DateValue> | null) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  const handleCardChange = (key: Key | null) => {
    if (key === null || key === "all") {
      onFiltersChange({ ...filters, cardIds: [] });
    } else {
      onFiltersChange({ ...filters, cardIds: [key as Id<"creditCards">] });
    }
  };

  const handleClearFilters = () => {
    onFiltersChange({
      ...defaultTransactionsFilters,
      searchQuery: filters.searchQuery, // Keep search query
    });
  };

  // Build card select items
  const cardSelectItems = [
    { id: "all", label: "All Cards" },
    ...cardOptions.map((card) => ({
      id: card.id,
      label: card.lastFour ? `${card.label} (****${card.lastFour})` : card.label,
    })),
  ];

  return (
    <div className="border-b border-secondary px-4 py-4 lg:px-6">
      {/* Always visible: Search + Filters toggle */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 gap-3">
          {/* Search */}
          <div className="flex-1 max-w-[320px]">
            <Input
              placeholder="Search transactions..."
              icon={SearchMd}
              size="sm"
              value={filters.searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          {/* Filters Toggle Button */}
          <Button
            color={isExpanded || hasActiveFilters ? "secondary" : "tertiary"}
            size="sm"
            iconLeading={FilterLines}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            Filters
            {hasActiveFilters && (
              <span className="ml-1 rounded-full bg-brand-500 px-1.5 text-xs font-medium text-white">
                {[
                  filters.category !== "all" ? 1 : 0,
                  filters.status !== "all" ? 1 : 0,
                  filters.dateRange !== null ? 1 : 0,
                  filters.cardIds.length > 0 ? 1 : 0,
                  filters.amountMin !== undefined || filters.amountMax !== undefined ? 1 : 0,
                ].reduce((a, b) => a + b, 0)}
              </span>
            )}
          </Button>
        </div>

        {/* Clear All Filters (shown when filters are active) */}
        {hasActiveFilters && (
          <Button
            color="link-gray"
            size="sm"
            iconLeading={XClose}
            onClick={handleClearFilters}
          >
            Clear all filters
          </Button>
        )}
      </div>

      {/* Expandable Filters Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-secondary pt-4 sm:grid-cols-2 lg:grid-cols-5">
              {/* Date Range */}
              <div>
                <DateRangePicker
                  value={filters.dateRange}
                  onChange={handleDateRangeChange}
                />
              </div>

              {/* Category */}
              <div>
                <Select
                  items={categoryItems}
                  selectedKey={filters.category}
                  onSelectionChange={handleCategoryChange}
                  placeholder="Category"
                  size="sm"
                >
                  {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>
              </div>

              {/* Source (Card) */}
              <div>
                <Select
                  items={cardSelectItems}
                  selectedKey={filters.cardIds.length > 0 ? filters.cardIds[0] : "all"}
                  onSelectionChange={handleCardChange}
                  placeholder="Source"
                  size="sm"
                >
                  {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>
              </div>

              {/* Status */}
              <div>
                <Select
                  items={statusItems}
                  selectedKey={filters.status}
                  onSelectionChange={handleStatusChange}
                  placeholder="Status"
                  size="sm"
                >
                  {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>
              </div>

              {/* Amount Range */}
              <div className="flex gap-2">
                <Input
                  placeholder="Min $"
                  size="sm"
                  type="number"
                  value={filters.amountMin?.toString() ?? ""}
                  onChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      amountMin: value ? parseFloat(value) : undefined,
                    })
                  }
                />
                <Input
                  placeholder="Max $"
                  size="sm"
                  type="number"
                  value={filters.amountMax?.toString() ?? ""}
                  onChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      amountMax: value ? parseFloat(value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
