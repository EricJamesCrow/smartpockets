"use client";

import { formatMoneyFromDollars } from "@/utils/money";
import { ToolCardShell } from "../shared/ToolCardShell";
import { useToolHintSend } from "../shared/useToolHintSend";
import type { ToolOutput, ToolResultComponentProps } from "../types";
import { MerchantsListSkeleton } from "./MerchantsListSkeleton";

type MerchantBucket = {
    name: string;
    count: number;
    /** Sum of `tx.amount / 1000` from the searchMerchants handler - dollars. */
    totalAmount: number;
    lastDate: string;
    sampleTransactionIds: string[];
};

type Preview = {
    merchants?: MerchantBucket[];
    summary?: string;
};

const MAX_VISIBLE_ROWS = 50;

function formatDate(dateString: string): string {
    if (!dateString) return "-";
    const [year, month, day] = dateString.split("-").map(Number);
    if (!year || !month || !day) return dateString;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWindow(window?: { from: string; to: string; granularity?: string }): string | undefined {
    if (!window) return undefined;
    return `${formatDate(window.from)} to ${formatDate(window.to)}`;
}

function formatAmount(dollars: number): string {
    return formatMoneyFromDollars(dollars);
}

function formatCount(count: number): string {
    return `${count} ${count === 1 ? "txn" : "txns"}`;
}

export function MerchantsList(props: ToolResultComponentProps<unknown, ToolOutput<Preview>>) {
    const { output, state } = props;
    const hint = useToolHintSend();

    if (state === "input-streaming" || !output) {
        return <MerchantsListSkeleton />;
    }

    const merchants = output.preview.merchants ?? [];
    const title = output.preview.summary ?? "Merchants";
    const subtitle = formatWindow(output.window);

    if (merchants.length === 0) {
        return (
            <ToolCardShell title={title} subtitle={subtitle}>
                <p className="text-tertiary text-sm">No matching merchants in the selected window.</p>
            </ToolCardShell>
        );
    }

    const visible = merchants.slice(0, MAX_VISIBLE_ROWS);
    const overflow = merchants.length - visible.length;

    return (
        <ToolCardShell title={title} subtitle={subtitle}>
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-tertiary text-left text-xs uppercase">
                        <th className="py-2 pr-2 font-medium">Merchant</th>
                        <th className="py-2 pr-2 text-right font-medium">Count</th>
                        <th className="py-2 pr-2 text-right font-medium">Total</th>
                        <th className="py-2 pr-2 text-right font-medium">Last seen</th>
                    </tr>
                </thead>
                <tbody>
                    {visible.map((merchant) => {
                        const sampleId = merchant.sampleTransactionIds[0];
                        const isClickable = Boolean(sampleId);
                        return (
                            <tr
                                key={merchant.name}
                                onClick={
                                    sampleId
                                        ? () => {
                                              void hint.openTransaction(sampleId);
                                          }
                                        : undefined
                                }
                                className={
                                    isClickable
                                        ? "border-secondary hover:bg-secondary/40 cursor-pointer border-t"
                                        : "border-secondary border-t"
                                }
                            >
                                <td className="text-primary py-2 pr-2 truncate">{merchant.name}</td>
                                <td className="text-secondary py-2 pr-2 text-right tabular-nums">
                                    {formatCount(merchant.count)}
                                </td>
                                <td className="text-primary py-2 pr-2 text-right tabular-nums">
                                    {formatAmount(merchant.totalAmount)}
                                </td>
                                <td className="text-secondary py-2 pr-2 text-right tabular-nums">
                                    {formatDate(merchant.lastDate)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {overflow > 0 && (
                <footer className="text-tertiary mt-3 text-xs">
                    Showing {visible.length} of {merchants.length} merchants. Refine the query to narrow results.
                </footer>
            )}
        </ToolCardShell>
    );
}
