"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ToolCardShell } from "../shared/ToolCardShell";
import { useLiveTransactions } from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import type { ToolOutput, ToolResultComponentProps } from "../types";
import { SpendOverTimeChartSkeleton } from "./SpendOverTimeChartSkeleton";

type Bucket = { from: string; to: string; amount: number };
type Granularity = "day" | "week" | "month";
type Preview = {
    buckets?: Bucket[];
    totalAmount?: number;
    summary?: string;
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function labelForBucket(bucket: Bucket, granularity: Granularity): string {
    const [y, m, d] = bucket.from.split("-").map(Number);
    if (!y || !m || !d) return bucket.from;
    const date = new Date(y, m - 1, d);
    if (granularity === "month") {
        return date.toLocaleDateString("en-US", { month: "short" });
    }
    if (granularity === "week") {
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function aggregateBuckets(
    transactions: { amount: number; date: string }[],
    window: { from: string; to: string; granularity?: Granularity },
): Bucket[] {
    const granularity: Granularity = window.granularity ?? "day";
    const buckets = new Map<string, Bucket>();
    for (const tx of transactions) {
        const [y, m, d] = tx.date.split("-").map(Number);
        if (!y || !m || !d) continue;
        let from: string;
        let to: string;
        if (granularity === "month") {
            from = `${y}-${String(m).padStart(2, "0")}-01`;
            to = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;
        } else if (granularity === "week") {
            const js = new Date(y, m - 1, d);
            const weekStart = new Date(js);
            weekStart.setDate(js.getDate() - js.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            from = weekStart.toISOString().slice(0, 10);
            to = weekEnd.toISOString().slice(0, 10);
        } else {
            from = tx.date;
            to = tx.date;
        }
        const existing = buckets.get(from);
        const dollars = tx.amount / 1000;
        if (existing) {
            existing.amount += dollars;
        } else {
            buckets.set(from, { from, to, amount: dollars });
        }
    }
    return Array.from(buckets.values()).sort((a, b) => a.from.localeCompare(b.from));
}

export function SpendOverTimeChart(
    props: ToolResultComponentProps<unknown, ToolOutput<Preview>>,
) {
    const { output, state } = props;
    const transactions = useLiveTransactions(output?.ids ?? []);
    const hint = useToolHintSend();

    if (state === "input-streaming" || !output) {
        return <SpendOverTimeChartSkeleton />;
    }

    const granularity: Granularity = output.window?.granularity ?? "day";
    const buckets: Bucket[] = transactions && output.window
        ? aggregateBuckets(transactions, { ...output.window, granularity })
        : output.preview.buckets ?? [];

    if (buckets.length === 0) {
        return (
            <ToolCardShell title={output.preview.summary ?? "Spend over time"}>
                <p className="text-sm text-tertiary">No spending in the selected window.</p>
            </ToolCardShell>
        );
    }

    const data = buckets.map((b) => ({ ...b, label: labelForBucket(b, granularity) }));
    const total = buckets.reduce((sum, b) => sum + b.amount, 0);

    return (
        <ToolCardShell
            title={output.preview.summary ?? "Spend over time"}
            subtitle={formatCurrency(total)}
        >
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                        <defs>
                            <linearGradient id="spend-over-time-gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--color-utility-brand-500)" stopOpacity={0.5} />
                                <stop offset="100%" stopColor="var(--color-utility-brand-500)" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="label"
                            stroke="var(--color-utility-gray-500)"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            stroke="var(--color-utility-gray-500)"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value: number) => formatCurrency(value)}
                            tickLine={false}
                            width={60}
                        />
                        <Tooltip
                            formatter={(value) => formatCurrency(Number(value))}
                            cursor={{ stroke: "var(--color-utility-brand-500)", strokeDasharray: "3 3" }}
                        />
                        <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="var(--color-utility-brand-600)"
                            strokeWidth={2}
                            fill="url(#spend-over-time-gradient)"
                            activeDot={{
                                r: 5,
                                style: { cursor: "pointer" },
                                onClick: (_event, payload) => {
                                    const raw = (payload as unknown as { payload?: Bucket })?.payload;
                                    if (raw?.from && raw?.to) {
                                        void hint.filterTransactionsByWindow(raw.from, raw.to);
                                    }
                                },
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-tertiary">
                Click a point to filter transactions to that {granularity}.
            </p>
        </ToolCardShell>
    );
}
