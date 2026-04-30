"use client";

import { Table } from "@repo/ui/untitledui/application/table/table";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { MerchantLogo } from "@/components/credit-cards/MerchantLogo";
import { formatTransactionDate, getCategoryBadgeColor } from "@/types/credit-cards";
import { formatTransactionAmount, mapPlaidCategory } from "@/utils/transaction-helpers";
import { TransactionSourceCell } from "./TransactionSourceCell";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Source info attached to each transaction by the listAllForUser query
 */
export interface TransactionSourceInfo {
    cardId: string;
    displayName: string;
    lastFour?: string;
    brand?: string;
    institutionName?: string;
}

/**
 * Aggregated transaction from the listAllForUser query
 * Includes source info for display in the unified transactions table
 */
export interface AggregatedTransaction {
    _id: string;
    transactionId: string;
    accountId: string;
    amount: number; // canonical milliunits
    isoCurrencyCode?: string;
    date: string;
    datetime?: string;
    name: string;
    merchantName?: string;
    pending: boolean;
    categoryPrimary?: string;
    categoryDetailed?: string;
    merchantEnrichment?: {
        merchantName: string;
        logoUrl?: string;
        categoryPrimary?: string;
        categoryIconUrl?: string;
        confidenceLevel: string;
    } | null;
    sourceInfo: TransactionSourceInfo;
}

interface TransactionsTableRowProps {
    transaction: AggregatedTransaction;
    onSelect: (transaction: AggregatedTransaction) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Single transaction row for the unified transactions table
 *
 * Displays: Date, Merchant, Category, Source (card), Status, Amount
 */
export function TransactionsTableRow({ transaction, onSelect }: TransactionsTableRowProps) {
    const category = mapPlaidCategory(transaction.categoryPrimary);
    const merchantName = transaction.merchantEnrichment?.merchantName ?? transaction.merchantName ?? transaction.name;
    const { text: amountText, colorClass: amountColor } = formatTransactionAmount(transaction.amount, transaction.isoCurrencyCode);

    return (
        <Table.Row id={transaction.transactionId} className="cursor-pointer" onAction={() => onSelect(transaction)}>
            {/* Date - mono, tabular */}
            <Table.Cell className="whitespace-nowrap font-[family-name:var(--font-jetbrains-mono)] text-[12.5px] tabular-nums text-zinc-400">
                {formatTransactionDate(transaction.date)}
            </Table.Cell>

            {/* Merchant with Logo */}
            <Table.Cell>
                <div className="flex items-center gap-3">
                    <MerchantLogo logoUrl={transaction.merchantEnrichment?.logoUrl} merchantName={merchantName} size="sm" />
                    <span className="max-w-[200px] truncate text-sm font-medium text-zinc-100">{merchantName}</span>
                </div>
            </Table.Cell>

            {/* Category */}
            <Table.Cell>
                <Badge color={getCategoryBadgeColor(category)} size="sm">
                    {category}
                </Badge>
            </Table.Cell>

            {/* Source (Card) */}
            <Table.Cell>
                <TransactionSourceCell
                    displayName={transaction.sourceInfo.displayName}
                    lastFour={transaction.sourceInfo.lastFour}
                    institutionName={transaction.sourceInfo.institutionName}
                    size="sm"
                />
            </Table.Cell>

            {/* Status - cockpit pill */}
            <Table.Cell>
                <Badge color={transaction.pending ? "warning" : "success"} size="sm">
                    {transaction.pending ? "PENDING" : "POSTED"}
                </Badge>
            </Table.Cell>

            {/* Amount - mono, tabular, color-coded */}
            <Table.Cell className="text-right">
                <span className={`font-[family-name:var(--font-jetbrains-mono)] text-[13px] font-medium tabular-nums ${amountColor}`}>
                    {amountText}
                </span>
            </Table.Cell>
        </Table.Row>
    );
}
