// apps/app/src/app/(app)/dashboard/components/SpendingBreakdown.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowUp, ArrowDown } from "@untitledui/icons";
import { Select } from "@repo/ui/untitledui/base/select/select";
import Link from "next/link";

const COLORS = [
  "#7F56D9", // Purple
  "#12B76A", // Green
  "#F79009", // Orange
  "#0BA5EC", // Blue
  "#F04438", // Red
  "#667085", // Gray (Other)
];

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

type Period = "this_month" | "last_month" | "last_90_days";

export function SpendingBreakdown() {
  const [period, setPeriod] = useState<Period>("this_month");
  const spending = useQuery(api.dashboard.queries.getSpendingBreakdown, {
    period,
  });

  if (!spending) {
    return (
      <div className="rounded-xl border border-primary bg-primary p-5">
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Spending This Month
        </h3>
        <div className="flex h-48 items-center justify-center">
          <div className="size-32 animate-pulse rounded-full bg-secondary" />
        </div>
      </div>
    );
  }

  const periodLabels: Record<Period, string> = {
    this_month: "This Month",
    last_month: "Last Month",
    last_90_days: "Last 90 Days",
  };

  const chartData = spending.categories.map((cat, i) => ({
    name: formatCategory(cat.category),
    value: cat.amount,
    color: COLORS[i % COLORS.length],
  }));

  const diff =
    spending.previousPeriodTotal != null
      ? spending.totalSpending - spending.previousPeriodTotal
      : null;

  return (
    <div className="rounded-xl border border-primary bg-primary p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-primary">
            Spending {periodLabels[period]}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(spending.totalSpending)}
            </span>
            {diff != null && (
              <span
                className={`flex items-center text-sm ${diff > 0 ? "text-error-600" : "text-success-600"}`}
              >
                {diff > 0 ? (
                  <ArrowUp className="size-4" />
                ) : (
                  <ArrowDown className="size-4" />
                )}
                {formatCurrency(Math.abs(diff))}
              </span>
            )}
          </div>
        </div>
        <Select
          size="sm"
          selectedKey={period}
          onSelectionChange={(key) => setPeriod(key as Period)}
          aria-label="Period"
          items={[
            { id: "this_month", label: "This Month" },
            { id: "last_month", label: "Last Month" },
            { id: "last_90_days", label: "Last 90 Days" },
          ]}
        >
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
      </div>

      {spending.categories.length === 0 ? (
        <p className="py-8 text-center text-sm text-tertiary">
          No spending data available
        </p>
      ) : (
        <div className="flex items-center gap-6">
          {/* Pie Chart */}
          <div className="h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {spending.categories.map((cat, i) => (
              <div key={cat.category} className="flex items-center gap-2">
                <div
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="flex-1 truncate text-sm text-secondary">
                  {formatCategory(cat.category)}
                </span>
                <span className="text-sm font-medium text-primary">
                  {formatCurrency(cat.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/transactions"
        className="mt-4 block text-center text-sm font-medium text-brand-secondary hover:underline"
      >
        View details →
      </Link>
    </div>
  );
}
