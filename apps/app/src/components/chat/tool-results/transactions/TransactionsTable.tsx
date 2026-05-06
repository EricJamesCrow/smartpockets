"use client";

import { formatTransactionAmount } from "@/utils/transaction-helpers";
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

    const presentation = (props.input as { presentation?: "widget" | "inline" } | undefined)?.presentation;
    if (presentation === "inline") {
        return null;
    }

    if (state === "input-streaming" || !output) {
        return <TransactionsTableSkeleton />;
    }
    if (output.ids.length === 0) {
        return (
            <ToolCardShell title={output.preview.summary ?? "Transactions"} subtitle={formatWindow(output.window)}>
                <p className="text-tertiary text-sm">No transactions in the selected window.</p>
            </ToolCardShell>
        );
    }
    if (rows === undefined) {
        return <TransactionsTableSkeleton />;
    }

    const visible = rows.slice(0, MAX_VISIBLE_ROWS);
    const overflow = output.ids.length - visible.length;

    return (
        <ToolCardShell title={output.preview.summary ?? "Transactions"} subtitle={formatWindow(output.window)}>
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-tertiary text-left text-xs uppercase">
                        <th className="py-2 pr-2 font-medium">Date</th>
                        <th className="py-2 pr-2 font-medium">Merchant</th>
                        <th className="py-2 pr-2 text-right font-medium">Amount</th>
                        <th className="py-2 font-medium">Category</th>
                    </tr>
                </thead>
                <tbody>
                    {visible.map((tx) => {
                        const { text: amountText, colorClass: amountColor } = formatTransactionAmount(tx.amount);
                        return (
                            <tr
                                key={tx._id}
                                onClick={() => {
                                    void hint.openTransaction(tx._id);
                                }}
                                className="border-secondary hover:bg-secondary/40 cursor-pointer border-t"
                            >
                                <td className="text-secondary py-2 pr-2 tabular-nums">{formatDate(tx.date)}</td>
                                <td className="text-primary py-2 pr-2">{tx.merchantName ?? tx.name}</td>
                                <td className={`py-2 pr-2 text-right tabular-nums ${amountColor}`}>{amountText}</td>
                                <td className="text-secondary py-2">{tx.categoryPrimary ?? "-"}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {overflow > 0 && (
                <footer className="text-tertiary mt-3 text-xs">
                    Showing {visible.length} of {output.ids.length}. Refine the window to narrow results.
                </footer>
            )}
        </ToolCardShell>
    );
}
