"use client";

import { DialogTrigger } from "react-aria-components";
import { MessageTextSquare01 } from "@untitledui/icons";
import { SlideoutMenu } from "@repo/ui/untitledui/application/slideout-menus/slideout-menu";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { MerchantLogo } from "./MerchantLogo";
import {
  formatDisplayCurrency,
  formatTransactionDateFull,
  getCategoryBadgeColor,
  type Transaction,
} from "@/types/credit-cards";

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  onClose: () => void;
}

/**
 * Transaction detail slideout drawer
 *
 * Displays detailed information about a selected transaction:
 * - Merchant info with logo
 * - Amount
 * - Date, status, category
 * - Recurring info (if applicable)
 * - Notes/description
 */
export function TransactionDetailDrawer({
  transaction,
  onClose,
}: TransactionDetailDrawerProps) {
  if (!transaction) return null;

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
                    merchantName={transaction.merchant}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-primary truncate">
                      {transaction.merchantEnrichment?.merchantName || transaction.merchant}
                    </h3>
                    <Badge
                      type="pill-color"
                      size="sm"
                      color={getCategoryBadgeColor(transaction.category)}
                      className="mt-1"
                    >
                      {transaction.category}
                    </Badge>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between border-b border-secondary pb-6">
                  <span className="text-sm font-medium text-tertiary">Amount</span>
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    {formatDisplayCurrency(transaction.amount)}
                  </span>
                </div>

                {/* Details List */}
                <div className="space-y-0">
                  <DetailRow label="Status">
                    <Badge
                      type="pill-color"
                      size="sm"
                      color={transaction.status === "Pending" ? "warning" : "gray"}
                    >
                      {transaction.status}
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
                      color={getCategoryBadgeColor(transaction.category)}
                    >
                      {transaction.category}
                    </Badge>
                  </DetailRow>

                  {transaction.isRecurring && (
                    <>
                      <DetailRow label="Recurring">
                        <Badge type="pill-color" size="sm" color="brand">
                          {transaction.recurringFrequency}
                        </Badge>
                      </DetailRow>
                      {transaction.nextChargeDate && (
                        <DetailRow label="Next Charge">
                          <span className="text-sm font-medium text-primary">
                            {formatTransactionDateFull(transaction.nextChargeDate)}
                          </span>
                        </DetailRow>
                      )}
                    </>
                  )}
                </div>

                {/* Description/Notes */}
                {transaction.description && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MessageTextSquare01 className="size-4 text-tertiary" />
                      <span className="text-sm font-semibold text-primary">Notes</span>
                    </div>
                    <p className="text-sm text-secondary leading-relaxed">
                      {transaction.description}
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
