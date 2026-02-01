"use client";

import { Table } from "@repo/ui/untitledui/application/table/table";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { Avatar } from "@repo/ui/untitledui/base/avatar/avatar";
import { MerchantLogo } from "./MerchantLogo";
import {
  formatTransactionDate,
  formatDisplayCurrency,
  getCategoryBadgeColor,
  type Transaction,
} from "@/types/credit-cards";

interface TransactionTableRowProps {
  transaction: Transaction;
  onSelect: (transaction: Transaction) => void;
}

/**
 * Single transaction row using UntitledUI Table.Row
 */
export function TransactionTableRow({ transaction, onSelect }: TransactionTableRowProps) {
  return (
    <Table.Row
      id={transaction.id}
      className="cursor-pointer"
      onAction={() => onSelect(transaction)}
    >
      {/* Date */}
      <Table.Cell className="text-sm text-secondary tabular-nums">
        {formatTransactionDate(transaction.date)}
      </Table.Cell>

      {/* Merchant with Avatar/Logo */}
      <Table.Cell>
        <div className="flex items-center gap-3">
          {transaction.merchantEnrichment?.logoUrl ? (
            <MerchantLogo
              logoUrl={transaction.merchantEnrichment.logoUrl}
              merchantName={transaction.merchant}
              size="sm"
            />
          ) : (
            <Avatar
              size="sm"
              initials={transaction.merchant.charAt(0).toUpperCase()}
            />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-primary">
              {transaction.merchant}
            </span>
            {transaction.isRecurring && (
              <span className="text-xs text-tertiary">
                {transaction.recurringFrequency}
              </span>
            )}
          </div>
        </div>
      </Table.Cell>

      {/* Category */}
      <Table.Cell>
        <Badge color={getCategoryBadgeColor(transaction.category)} size="sm">
          {transaction.category}
        </Badge>
      </Table.Cell>

      {/* Amount */}
      <Table.Cell className="text-right">
        <span className="text-sm font-medium text-primary tabular-nums">
          {formatDisplayCurrency(transaction.amount)}
        </span>
      </Table.Cell>

      {/* Status */}
      <Table.Cell>
        <Badge
          color={transaction.status === "Posted" ? "success" : "warning"}
          size="sm"
        >
          {transaction.status}
        </Badge>
      </Table.Cell>

      {/* Notes/Description */}
      <Table.Cell>
        <span className="text-sm text-tertiary line-clamp-1">
          {transaction.description || "--"}
        </span>
      </Table.Cell>
    </Table.Row>
  );
}
