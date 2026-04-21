"use client";

import { ToolCardShell } from "../shared/ToolCardShell";
import { useLiveTransactions } from "../shared/liveRowsHooks";
import { useToolHintSend } from "../shared/useToolHintSend";
import type { ToolOutput, ToolResultComponentProps } from "../types";
import { TransactionDetailCardSkeleton } from "./TransactionDetailCardSkeleton";

type Preview = {
    merchantName?: string;
    amount?: number;
    date?: string;
    categoryPrimary?: string | null;
};

function formatAmount(milliunits: number): string {
    const dollars = milliunits / 1000;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dollars);
}

function formatDateFull(dateString: string): string {
    const [year, month, day] = dateString.split("-").map(Number);
    if (!year || !month || !day) return dateString;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function TransactionDetailCard(
    props: ToolResultComponentProps<unknown, ToolOutput<Preview>>,
) {
    const { output, state } = props;
    const rows = useLiveTransactions(output?.ids ?? []);
    const hint = useToolHintSend();

    if (state === "input-streaming" || !output) {
        return <TransactionDetailCardSkeleton />;
    }

    // Prefer the live row when available; fall back to preview payload so the
    // card stays readable even when the helper query is still stubbed.
    const live = rows?.[0];
    const preview = output.preview;
    const id = live?._id ?? output.ids[0];
    const merchant = live?.merchantName ?? live?.name ?? preview.merchantName ?? "Unknown merchant";
    const amount = live?.amount ?? preview.amount;
    const date = live?.date ?? preview.date;
    const category = live?.categoryPrimary ?? preview.categoryPrimary ?? null;

    if (rows !== undefined && rows.length === 0) {
        return (
            <ToolCardShell title="Transaction not found">
                <p className="text-sm text-tertiary">
                    The transaction may have been deleted or you no longer have access.
                </p>
            </ToolCardShell>
        );
    }

    return (
        <ToolCardShell
            title={merchant}
            subtitle={date ? formatDateFull(date) : undefined}
            action={
                <button
                    type="button"
                    className="rounded-md border border-secondary px-2 py-1 text-xs font-medium text-secondary hover:bg-secondary/50"
                    onClick={() => {
                        if (id) void hint.editTransactionCategory(id, category);
                    }}
                >
                    Edit category
                </button>
            }
        >
            <dl className="space-y-2 text-sm">
                {amount !== undefined && (
                    <div className="flex items-baseline justify-between">
                        <dt className="text-tertiary">Amount</dt>
                        <dd className="font-semibold tabular-nums text-primary">{formatAmount(amount)}</dd>
                    </div>
                )}
                <div className="flex items-baseline justify-between">
                    <dt className="text-tertiary">Category</dt>
                    <dd className="text-primary">{category ?? "Uncategorized"}</dd>
                </div>
                {live?.pending && (
                    <div className="flex items-baseline justify-between">
                        <dt className="text-tertiary">Status</dt>
                        <dd className="text-utility-warning-700">Pending</dd>
                    </div>
                )}
            </dl>
        </ToolCardShell>
    );
}
