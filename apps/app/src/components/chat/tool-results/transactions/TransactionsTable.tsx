"use client";

import { ToolCardShell } from "../shared/ToolCardShell";
import { useLiveTransactions } from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import type { ToolOutput, ToolResultComponentProps } from "../types";
import { TransactionsTableSkeleton } from "./TransactionsTableSkeleton";

type Preview = {
    totalCount: number;
    summary?: string;
};

const MAX_VISIBLE_ROWS = 500;

function formatAmount(milliunits: number): string {
    const dollars = milliunits / 1000;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dollars);
}

function formatDate(dateString: string): string {
    const [year, month, day] = dateString.split("-").map(Number);
    if (!year || !month || !day) return dateString;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWindow(window?: { from: string; to: string; granularity?: string }): string | undefined {
    if (!window) return undefined;
    return `${formatDate(window.from)} to ${formatDate(window.to)}`;
}

export function TransactionsTable(props: ToolResultComponentProps<unknown, ToolOutput<Preview>>) {
    const { output, state } = props;
    const rows = useLiveTransactions(output?.ids ?? []);
    const hint = useToolHintSend();

    if (state === "input-streaming" || !output) {
        return <TransactionsTableSkeleton />;
    }
    if (output.ids.length === 0) {
        return (
            <ToolCardShell
                title={output.preview.summary ?? "Transactions"}
                subtitle={formatWindow(output.window)}
            >
                <p className="text-sm text-tertiary">No transactions in the selected window.</p>
            </ToolCardShell>
        );
    }
    if (rows === undefined) {
        return <TransactionsTableSkeleton />;
    }

    const visible = rows.slice(0, MAX_VISIBLE_ROWS);
    const overflow = output.ids.length - visible.length;

    return (
        <ToolCardShell
            title={output.preview.summary ?? "Transactions"}
            subtitle={formatWindow(output.window)}
        >
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-xs uppercase text-tertiary">
                        <th className="py-2 pr-2 font-medium">Date</th>
                        <th className="py-2 pr-2 font-medium">Merchant</th>
                        <th className="py-2 pr-2 text-right font-medium">Amount</th>
                        <th className="py-2 font-medium">Category</th>
                    </tr>
                </thead>
                <tbody>
                    {visible.map((tx) => (
                        <tr
                            key={tx._id}
                            onClick={() => {
                                void hint.openTransaction(tx._id);
                            }}
                            className="cursor-pointer border-t border-secondary hover:bg-secondary/40"
                        >
                            <td className="py-2 pr-2 text-secondary tabular-nums">{formatDate(tx.date)}</td>
                            <td className="py-2 pr-2 text-primary">{tx.merchantName ?? tx.name}</td>
                            <td className="py-2 pr-2 text-right text-primary tabular-nums">
                                {formatAmount(tx.amount)}
                            </td>
                            <td className="py-2 text-secondary">{tx.categoryPrimary ?? "-"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {overflow > 0 && (
                <footer className="mt-3 text-xs text-tertiary">
                    Showing {visible.length} of {output.ids.length}. Refine the window to narrow results.
                </footer>
            )}
        </ToolCardShell>
    );
}
