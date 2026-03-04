"use client";

import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { MerchantLogo } from "@/components/credit-cards/MerchantLogo";
import { formatTransactionAmount } from "@/utils/transaction-helpers";
import type { DetailPanelTransaction } from "./TransactionDetailPanel";

interface TransactionDetailMerchantProps {
  transaction: DetailPanelTransaction;
}

/**
 * Merchant section: logo, display name, formatted amount, and optional source card badge.
 */
export function TransactionDetailMerchant({
  transaction,
}: TransactionDetailMerchantProps) {
  const merchantName =
    transaction.merchantEnrichment?.merchantName ??
    transaction.merchantName ??
    transaction.name;

  const { text: amountText, colorClass: amountColor } =
    formatTransactionAmount(transaction.amount, transaction.isoCurrencyCode);

  return (
    <div className="flex items-center gap-4 border-b border-secondary pb-6">
      <MerchantLogo
        logoUrl={transaction.merchantEnrichment?.logoUrl}
        merchantName={merchantName}
        size="lg"
      />
      <div className="flex-1 min-w-0">
        <h3 className="text-xl font-semibold text-primary truncate">
          {merchantName}
        </h3>
        <p className={`mt-0.5 text-2xl font-bold tabular-nums ${amountColor}`}>
          {amountText}
        </p>
        {transaction.sourceInfo && (
          <Badge type="pill-color" size="sm" color="gray" className="mt-1">
            {transaction.sourceInfo.displayName}
            {transaction.sourceInfo.lastFour
              ? ` ••${transaction.sourceInfo.lastFour}`
              : ""}
          </Badge>
        )}
      </div>
    </div>
  );
}
