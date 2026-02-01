"use client";

import Link from "next/link";
import { DialogTrigger } from "react-aria-components";
import { CreditCard02 } from "@untitledui/icons";
import { SlideoutMenu } from "@repo/ui/untitledui/application/slideout-menus/slideout-menu";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { MerchantLogo } from "@/components/credit-cards/MerchantLogo";
import { TransactionSourceCell } from "./TransactionSourceCell";
import type { AggregatedTransaction } from "./TransactionsTableRow";
import {
  formatTransactionDateFull,
  getCategoryBadgeColor,
} from "@/types/credit-cards";
import {
  mapPlaidCategory,
  formatTransactionAmount,
} from "@/utils/transaction-helpers";

interface TransactionDetailDrawerProps {
  transaction: AggregatedTransaction | null;
  onClose: () => void;
}

/**
 * Transaction detail slideout drawer for the unified transactions page
 *
 * Shows detailed information about a selected transaction including:
 * - Merchant info with logo
 * - Amount
 * - Date, status, category
 * - Source card with link to card detail
 */
export function TransactionDetailDrawer({
  transaction,
  onClose,
}: TransactionDetailDrawerProps) {
  if (!transaction) return null;

  const category = mapPlaidCategory(transaction.categoryPrimary);
  const merchantName =
    transaction.merchantEnrichment?.merchantName ??
    transaction.merchantName ??
    transaction.name;
  const { text: amountText, isRefund } = formatTransactionAmount(
    transaction.amount,
    transaction.isoCurrencyCode
  );

  return (
    <DialogTrigger isOpen={transaction !== null} onOpenChange={(open) => !open && onClose()}>
      <SlideoutMenu>
        {({ close }) => (
          <>
            <SlideoutMenu.Header onClose={close}>
              <div className="pr-10">
                <h2 className="text-lg font-semibold text-primary">
                  Transaction Details
                </h2>
                <p className="mt-0.5 text-sm text-tertiary">
                  {formatTransactionDateFull(transaction.date)}
                </p>
              </div>
            </SlideoutMenu.Header>

            <SlideoutMenu.Content>
              <div className="flex flex-col gap-6 py-2">
                {/* Merchant Info */}
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
                    <Badge
                      type="pill-color"
                      size="sm"
                      color={getCategoryBadgeColor(category)}
                      className="mt-1"
                    >
                      {category}
                    </Badge>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between border-b border-secondary pb-6">
                  <span className="text-sm font-medium text-tertiary">Amount</span>
                  <span
                    className={`text-2xl font-bold tabular-nums ${
                      isRefund ? "text-utility-success-600" : "text-primary"
                    }`}
                  >
                    {amountText}
                  </span>
                </div>

                {/* Details List */}
                <div className="space-y-0">
                  <DetailRow label="Status">
                    <Badge
                      type="pill-color"
                      size="sm"
                      color={transaction.pending ? "warning" : "success"}
                    >
                      {transaction.pending ? "Pending" : "Posted"}
                    </Badge>
                  </DetailRow>

                  <DetailRow label="Date">
                    <span className="text-sm font-medium text-primary">
                      {formatTransactionDateFull(transaction.date)}
                    </span>
                  </DetailRow>

                  <DetailRow label="Category">
                    <Badge
                      type="pill-color"
                      size="sm"
                      color={getCategoryBadgeColor(category)}
                    >
                      {category}
                    </Badge>
                  </DetailRow>

                  {transaction.datetime && (
                    <DetailRow label="Time">
                      <span className="text-sm font-medium text-primary">
                        {new Date(transaction.datetime).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </DetailRow>
                  )}
                </div>

                {/* Source Card Section */}
                <div className="border-t border-secondary pt-6">
                  <h4 className="mb-4 text-sm font-semibold text-primary">
                    Source Card
                  </h4>
                  <div className="flex items-center justify-between rounded-lg border border-secondary p-4">
                    <TransactionSourceCell
                      displayName={transaction.sourceInfo.displayName}
                      lastFour={transaction.sourceInfo.lastFour}
                      institutionName={transaction.sourceInfo.institutionName}
                      size="md"
                    />
                    <Link href={`/credit-cards/${transaction.sourceInfo.cardId}`}>
                      <Button
                        color="secondary"
                        size="sm"
                        iconLeading={CreditCard02}
                      >
                        View card
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Original Description (if different from merchant name) */}
                {transaction.name !== merchantName && (
                  <div className="border-t border-secondary pt-6">
                    <h4 className="mb-2 text-sm font-semibold text-primary">
                      Original Description
                    </h4>
                    <p className="text-sm text-secondary">
                      {transaction.name}
                    </p>
                  </div>
                )}
              </div>
            </SlideoutMenu.Content>
          </>
        )}
      </SlideoutMenu>
    </DialogTrigger>
  );
}

/**
 * Helper component for detail rows
 */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-secondary last:border-b-0">
      <span className="text-sm font-medium text-tertiary">{label}</span>
      {children}
    </div>
  );
}
