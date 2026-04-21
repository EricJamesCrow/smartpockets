"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ToolCardShell } from "../shared/ToolCardShell";
import { useLiveTransactions } from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import type { ToolOutput, ToolResultComponentProps } from "../types";
import { SpendByCategoryChartSkeleton } from "./SpendByCategoryChartSkeleton";

type Bucket = { category: string; amount: number };
type Preview = {
    buckets?: Bucket[];
    totalAmount?: number;
    summary?: string;
};

// Chart palette uses Tailwind theme variables exposed by @repo/ui/styles/theme.css
// so dark-mode token swaps cascade automatically. Do not substitute hex literals.
const PALETTE: string[] = [
    "var(--color-utility-brand-500)",
    "var(--color-utility-blue-500)",
    "var(--color-utility-warning-500)",
    "var(--color-utility-success-500)",
    "var(--color-utility-error-500)",
    "var(--color-utility-gray-500)",
    "var(--color-utility-orange-500)",
    "var(--color-utility-brand-700)",
];

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function aggregateByCategory(transactions: { amount: number; categoryPrimary?: string | null }[]): Bucket[] {
    const totals = new Map<string, number>();
    for (const tx of transactions) {
        const key = tx.categoryPrimary ?? "Uncategorized";
        const dollars = tx.amount / 1000;
        totals.set(key, (totals.get(key) ?? 0) + dollars);
    }
    return Array.from(totals, ([category, amount]) => ({ category, amount })).sort(
        (a, b) => b.amount - a.amount,
    );
}

export function SpendByCategoryChart(
    props: ToolResultComponentProps<unknown, ToolOutput<Preview>>,
) {
    const { output, state } = props;
    const transactions = useLiveTransactions(output?.ids ?? []);
    const hint = useToolHintSend();

    if (state === "input-streaming" || !output) {
        return <SpendByCategoryChartSkeleton />;
    }

    const buckets: Bucket[] = transactions
        ? aggregateByCategory(transactions)
        : output.preview.buckets ?? [];

    if (buckets.length === 0) {
        return (
            <ToolCardShell title={output.preview.summary ?? "Spend by category"}>
                <p className="text-sm text-tertiary">No spending in the selected window.</p>
            </ToolCardShell>
        );
    }

    const total = buckets.reduce((sum, b) => sum + b.amount, 0);

    return (
        <ToolCardShell
            title={output.preview.summary ?? "Spend by category"}
            subtitle={formatCurrency(total)}
        >
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <div className="h-40 w-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={buckets}
                                dataKey="amount"
                                nameKey="category"
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={2}
                                onClick={(entry: { category?: string }) => {
                                    if (entry?.category) {
                                        void hint.filterTransactionsByCategory(entry.category);
                                    }
                                }}
                            >
                                {buckets.map((entry, index) => (
                                    <Cell
                                        key={entry.category}
                                        fill={PALETTE[index % PALETTE.length]}
                                        className="cursor-pointer"
                                    />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <ul className="flex-1 space-y-2 text-sm">
                    {buckets.slice(0, 6).map((bucket, index) => (
                        <li key={bucket.category} className="flex items-center gap-2">
                            <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    void hint.filterTransactionsByCategory(bucket.category);
                                }}
                                className="flex-1 truncate text-left text-secondary hover:text-primary hover:underline"
                            >
                                {bucket.category}
                            </button>
                            <span className="tabular-nums text-primary">
                                {formatCurrency(bucket.amount)}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </ToolCardShell>
    );
}
