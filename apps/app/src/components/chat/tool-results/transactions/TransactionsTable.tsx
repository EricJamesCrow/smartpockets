"use client";

import { Table } from "@repo/ui/untitledui/application/table/table";
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

    // React Aria's `Table.Body` collection requires each item to expose an `id` key.
    // The live-rows hook returns rows with `_id`, so map to a new shape that
    // includes the `id` field react-aria-components needs for keying + selection
    // bookkeeping. This also keeps the `id` value identical to `_id` so
    // `onAction` callbacks pass through the canonical Convex id.
    const visible = rows
        .slice(0, MAX_VISIBLE_ROWS)
        .map((tx) => ({ ...tx, id: tx._id }));
    const overflow = output.ids.length - visible.length;

    return (
        <ToolCardShell title={output.preview.summary ?? "Transactions"} subtitle={formatWindow(output.window)}>
            <Table aria-label={output.preview.summary ?? "Transactions"} selectionMode="none" className="text-sm">
                <Table.Header bordered={false} className="bg-transparent! h-auto!">
                    <Table.Head id="date" isRowHeader className="text-tertiary text-left text-xs font-medium uppercase py-2 pr-2 px-0!">
                        Date
                    </Table.Head>
                    <Table.Head id="merchant" className="text-tertiary text-left text-xs font-medium uppercase py-2 pr-2 px-0!">
                        Merchant
                    </Table.Head>
                    <Table.Head id="amount" className="text-tertiary text-right text-xs font-medium uppercase py-2 pr-2 px-0! [&>div]:justify-end">
                        Amount
                    </Table.Head>
                    <Table.Head id="category" className="text-tertiary text-left text-xs font-medium uppercase py-2 px-0!">
                        Category
                    </Table.Head>
                </Table.Header>
                <Table.Body items={visible}>
                    {(tx) => {
                        const { text: amountText, colorClass: amountColor } = formatTransactionAmount(tx.amount);
                        return (
                            <Table.Row
                                id={tx._id}
                                onAction={() => {
                                    void hint.openTransaction(tx._id);
                                }}
                                // ARIA grid pattern: focus moves cell-by-cell with arrow keys, so the
                                // visible focus ring is owned by the gridcell (via `outline-focus-ring`
                                // on `Table.Cell`). The row only owns hover/focus-within highlights.
                                // The wrapper already paints per-cell `:after` row separators; no need
                                // for an explicit `border-t` here.
                                className="hover:bg-secondary/40 has-[:focus-visible]:bg-secondary/60 cursor-pointer h-auto!"
                            >
                                <Table.Cell className="text-secondary py-2 pr-2 px-0! tabular-nums">{formatDate(tx.date)}</Table.Cell>
                                <Table.Cell className="text-primary py-2 pr-2 px-0!">{tx.merchantName ?? tx.name}</Table.Cell>
                                <Table.Cell className={`py-2 pr-2 px-0! text-right tabular-nums ${amountColor}`}>{amountText}</Table.Cell>
                                <Table.Cell className="text-secondary py-2 px-0!">{tx.categoryPrimary ?? "-"}</Table.Cell>
                            </Table.Row>
                        );
                    }}
                </Table.Body>
            </Table>
            {overflow > 0 && (
                <footer className="text-tertiary mt-3 text-xs">
                    Showing {visible.length} of {output.ids.length}. Refine the window to narrow results.
                </footer>
            )}
        </ToolCardShell>
    );
}
