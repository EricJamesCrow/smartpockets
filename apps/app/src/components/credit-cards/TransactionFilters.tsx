"use client";

import type { Key } from "react";
import type { RangeValue } from "@react-types/shared";
import { DateRangePicker } from "@repo/ui/untitledui/application/date-picker/date-range-picker";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { Select } from "@repo/ui/untitledui/base/select/select";
import { SearchMd } from "@untitledui/icons";
import type { DateValue } from "react-aria-components";
import { TRANSACTION_CATEGORIES } from "@/types/credit-cards";

const categoryItems = [{ id: "all", label: "All Categories" }, ...TRANSACTION_CATEGORIES.map((cat) => ({ id: cat, label: cat }))];

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
}

/**
 * Transaction filter bar with search, dropdowns, and date range picker
 * Positioned ABOVE the table per SmartPockets design
 */
export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
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
        <div className="gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6 flex flex-col">
            {/* Left: Search and Filters */}
            <div className="gap-3 lg:flex-row lg:items-center flex flex-col">
                {/* Search */}
                <div className="lg:w-[240px] w-full">
                    <Input placeholder="Search transactions..." icon={SearchMd} size="sm" value={filters.searchQuery} onChange={handleSearchChange} />
                </div>

                {/* Category Filter */}
                <div className="lg:w-[160px] w-full">
                    <Select items={categoryItems} selectedKey={filters.category} onSelectionChange={handleCategoryChange} placeholder="Category" size="sm">
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>
                </div>

                {/* Status Filter */}
                <div className="lg:w-[120px] w-full">
                    <Select items={statusItems} selectedKey={filters.status} onSelectionChange={handleStatusChange} placeholder="Status" size="sm">
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>
                </div>

                {/* Date Range Picker */}
                <div className="lg:w-auto w-full">
                    <DateRangePicker value={filters.dateRange} onChange={handleDateRangeChange} />
                </div>
            </div>
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
