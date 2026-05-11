"use client";

import { Table } from "@repo/ui/untitledui/application/table/table";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { MerchantLogo } from "@/components/credit-cards/MerchantLogo";
import { TransactionSourceCell } from "@/components/transactions/TransactionSourceCell";
import { formatTransactionDate, getCategoryBadgeColor } from "@/types/credit-cards";
import { formatTransactionAmount, mapPlaidCategory } from "@/utils/transaction-helpers";
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
        <ToolCardShell
            title={output.preview.summary ?? "Transactions"}
            subtitle={formatWindow(output.window)}
            // Widen beyond the default 640px max so the 6-column table (date,
            // merchant w/ logo, category badge, source w/ logo, status badge,
            // amount) has room to breathe without horizontal scroll.
            className="max-w-[820px]!"
        >
            <Table aria-label={output.preview.summary ?? "Transactions"} selectionMode="none" size="sm" className="text-sm">
                <Table.Header bordered={false} className="bg-transparent! h-auto!">
                    <Table.Head id="date" isRowHeader className="text-tertiary text-left text-xs font-medium uppercase py-2 pr-2 px-0!">
                        Date
                    </Table.Head>
                    <Table.Head id="merchant" className="text-tertiary text-left text-xs font-medium uppercase py-2 pr-2 px-0!">
                        Merchant
                    </Table.Head>
                    <Table.Head id="category" className="text-tertiary text-left text-xs font-medium uppercase py-2 pr-2 px-0!">
                        Category
                    </Table.Head>
                    <Table.Head id="source" className="text-tertiary text-left text-xs font-medium uppercase py-2 pr-2 px-0!">
                        Source
                    </Table.Head>
                    <Table.Head id="status" className="text-tertiary text-left text-xs font-medium uppercase py-2 pr-2 px-0!">
                        Status
                    </Table.Head>
                    <Table.Head id="amount" className="text-tertiary text-right text-xs font-medium uppercase py-2 px-0! [&>div]:justify-end">
                        Amount
                    </Table.Head>
                </Table.Header>
                <Table.Body items={visible}>
                    {(tx) => {
                        const category = mapPlaidCategory(tx.categoryPrimary ?? undefined);
                        const merchantName = tx.merchantEnrichment?.merchantName ?? tx.merchantName ?? tx.name;
                        const { text: amountText, colorClass: amountColor } = formatTransactionAmount(
                            tx.amount,
                            tx.isoCurrencyCode ?? undefined,
                        );
                        const pending = tx.pending ?? false;
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
                                <Table.Cell className="text-secondary py-2.5 pr-2 px-0! tabular-nums whitespace-nowrap">
                                    {formatTransactionDate(tx.date)}
                                </Table.Cell>
                                <Table.Cell className="py-2.5 pr-2 px-0!">
                                    <div className="flex items-center gap-2.5">
                                        <MerchantLogo
                                            logoUrl={tx.merchantEnrichment?.logoUrl ?? tx.logoUrl ?? undefined}
                                            merchantName={merchantName}
                                            size="sm"
                                        />
                                        <span className="text-primary max-w-[160px] truncate text-sm font-medium">
                                            {merchantName}
                                        </span>
                                    </div>
                                </Table.Cell>
                                <Table.Cell className="py-2.5 pr-2 px-0!">
                                    <Badge color={getCategoryBadgeColor(category)} size="sm">
                                        {category}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell className="py-2.5 pr-2 px-0!">
                                    {tx.sourceInfo ? (
                                        <TransactionSourceCell
                                            displayName={tx.sourceInfo.displayName}
                                            lastFour={tx.sourceInfo.lastFour}
                                            institutionName={tx.sourceInfo.institutionName}
                                            size="sm"
                                        />
                                    ) : (
                                        <span className="text-tertiary text-xs">-</span>
                                    )}
                                </Table.Cell>
                                <Table.Cell className="py-2.5 pr-2 px-0!">
                                    <Badge color={pending ? "warning" : "success"} size="sm">
                                        {pending ? "Pending" : "Posted"}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell className={`py-2.5 px-0! text-right tabular-nums font-medium ${amountColor}`}>
                                    {amountText}
                                </Table.Cell>
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
