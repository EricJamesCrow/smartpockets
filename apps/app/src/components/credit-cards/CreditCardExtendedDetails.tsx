"use client";

import { motion, AnimatePresence } from "motion/react";
import { cx } from "@repo/ui/utils";
import { UtilizationProgress } from "./UtilizationProgress";
import { PaymentDueBadge } from "./PaymentDueBadge";
import { CreditCardStatusBadge } from "./CreditCardStatusBadge";
import {
  formatDisplayCurrency,
  formatApr,
  formatDueDate,
  type ExtendedCreditCardData,
} from "@/types/credit-cards";

interface CreditCardExtendedDetailsProps {
  card: ExtendedCreditCardData;
  isVisible: boolean;
  className?: string;
}

/**
 * Extended details panel for credit card
 *
 * Shows:
 * - Balance / Available Credit / Credit Limit
 * - Utilization progress bar
 * - APR
 * - Payment due date
 * - Minimum payment
 * - Status badges
 */
export function CreditCardExtendedDetails({
  card,
  isVisible,
  className,
}: CreditCardExtendedDetailsProps) {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: "auto", marginTop: 12 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={cx("overflow-hidden", className)}
        >
          <div className="rounded-lg border border-secondary bg-secondary/30 p-4">
            {/* Financial Summary */}
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-tertiary">Balance</p>
                <p className="text-sm font-semibold text-primary">
                  {formatDisplayCurrency(card.currentBalance)}
                </p>
              </div>
              <div>
                <p className="text-xs text-tertiary">Available</p>
                <p className="text-sm font-semibold text-utility-success-600">
                  {formatDisplayCurrency(card.availableCredit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-tertiary">Limit</p>
                <p className="text-sm font-semibold text-primary">
                  {formatDisplayCurrency(card.creditLimit)}
                </p>
              </div>
            </div>

            {/* Utilization */}
            <div className="mb-4">
              <UtilizationProgress
                utilization={card.utilization}
                showLabel
                showPercentage
                size="sm"
              />
            </div>

            {/* APR & Payment Info */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-tertiary">Purchase APR</p>
                <p className="text-sm font-medium text-primary">
                  {formatApr(card.apr)}
                </p>
              </div>
              <div>
                <p className="text-xs text-tertiary">Min Payment</p>
                <p className="text-sm font-medium text-primary">
                  {formatDisplayCurrency(card.minimumPaymentAmount)}
                </p>
              </div>
            </div>

            {/* Status Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCardStatusBadge
                  isLocked={card.isLocked}
                  isActive={card.isActive}
                  isOverdue={card.isOverdue}
                  size="sm"
                />
                <PaymentDueBadge
                  nextPaymentDueDate={card.nextPaymentDueDate}
                  isOverdue={card.isOverdue}
                  size="sm"
                />
              </div>

              {/* Due date display */}
              {card.nextPaymentDueDate && (
                <span className="text-xs text-tertiary">
                  Due: {formatDueDate(card.nextPaymentDueDate)}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
