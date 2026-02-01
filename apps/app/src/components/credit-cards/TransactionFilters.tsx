"use client";

import type { DateValue } from "react-aria-components";
import type { RangeValue } from "@react-types/shared";
import type { Key } from "react";
import { SearchMd, Download01 } from "@untitledui/icons";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { Select } from "@repo/ui/untitledui/base/select/select";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { DateRangePicker } from "@repo/ui/untitledui/application/date-picker/date-range-picker";
import { TRANSACTION_CATEGORIES } from "@/types/credit-cards";

const categoryItems = [
  { id: "all", label: "All Categories" },
  ...TRANSACTION_CATEGORIES.map((cat) => ({ id: cat, label: cat })),
];

const statusItems = [
  { id: "all", label: "All Status" },
  { id: "Posted", label: "Posted" },
  { id: "Pending", label: "Pending" },
];

export interface TransactionFiltersState {
  searchQuery: string;
  category: string;
  status: string;
  dateRange: RangeValue<DateValue> | null;
}

interface TransactionFiltersProps {
  filters: TransactionFiltersState;
  onFiltersChange: (filters: TransactionFiltersState) => void;
  onExport?: () => void;
}

/**
 * Transaction filter bar with search, dropdowns, and date range picker
 * Positioned ABOVE the table per SmartPockets design
 */
export function TransactionFilters({
  filters,
  onFiltersChange,
  onExport,
}: TransactionFiltersProps) {
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

  return (
    <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      {/* Left: Search and Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Search */}
        <div className="w-full lg:w-[240px]">
          <Input
            placeholder="Search transactions..."
            icon={SearchMd}
            size="sm"
            value={filters.searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        {/* Category Filter */}
        <div className="w-full lg:w-[160px]">
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

        {/* Status Filter */}
        <div className="w-full lg:w-[120px]">
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

        {/* Date Range Picker */}
        <div className="w-full lg:w-auto">
          <DateRangePicker
            value={filters.dateRange}
            onChange={handleDateRangeChange}
          />
        </div>
      </div>

      {/* Right: Export Button (disabled - coming soon) */}
      {onExport && (
        <Button
          color="secondary"
          size="sm"
          iconLeading={Download01}
          onClick={onExport}
          isDisabled
        >
          Export
        </Button>
      )}
    </div>
  );
}

/**
 * Default filter state
 */
export const defaultTransactionFilters: TransactionFiltersState = {
  searchQuery: "",
  category: "all",
  status: "all",
  dateRange: null,
};
