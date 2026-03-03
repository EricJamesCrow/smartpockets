"use client";

import { motion } from "motion/react";
import type { Id } from "@convex/_generated/dataModel";
import { cx } from "@repo/ui/utils";
import { formatDisplayCurrency, getPurchaseApr } from "@/types/credit-cards";

// Section components
import { StatementClosingBanner } from "./details/StatementClosingBanner";
import { BalanceReconciliation } from "./details/BalanceReconciliation";
import { AprBreakdown } from "./details/AprBreakdown";
import { PromoTracker } from "./details/PromoTracker";
import { InterestSavingBalance } from "./details/InterestSavingBalance";
import { FeesInterestYtd } from "./details/FeesInterestYtd";
import { PayOverTimeSection } from "./details/PayOverTimeSection";

// Keep the existing CardData interface — this is the raw Convex query result shape
interface CardData {
  _id: Id<"creditCards">;
  _creationTime: number;
  accountName: string;
  officialName?: string | null;
  company?: string | null;
  brand?: string | null;
  lastFour?: string | null;
  accountType?: string | null;
  accountSubtype?: string | null;
  isoCurrencyCode?: string | null;
  aprs?: Array<{
    aprPercentage: number;
    aprType: string;
    balanceSubjectToApr?: number | null;
    interestChargeAmount?: number | null;
  }> | null;
  lastPaymentAmount?: number | null;
  lastPaymentDate?: string | null;
  lastStatementBalance?: number | null;
  lastStatementIssueDate?: string | null;
  syncStatus?: string | null;
  lastSyncedAt?: number | null;
  lastSyncError?: string | null;
  // New fields
  statementClosingDay?: number | null;
  payOverTimeEnabled?: boolean | null;
  payOverTimeLimit?: number | null;
  payOverTimeApr?: number | null;
  availableCredit?: number | null;
}

interface CardDetailsTabProps {
  cardId: Id<"creditCards">;
  cardData: CardData | null | undefined;
}

/**
 * Card Details Tab — Statement-styled orchestrator
 *
 * Composes section components into a full details view:
 * StatementClosingBanner, BalanceReconciliation, AprBreakdown,
 * PromoTracker, InterestSavingBalance, FeesInterestYtd,
 * PayOverTimeSection, Account Details, Payment History, Sync Status
 */
export function CardDetailsTab({ cardId, cardData }: CardDetailsTabProps) {
  if (!cardData) {
    return (
      <div className="p-6 text-center text-sm text-tertiary">
        Loading card details...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Statement closing date banner */}
      <StatementClosingBanner
        creditCardId={cardId}
        statementClosingDay={cardData.statementClosingDay}
      />

      {/* Section 1: Balance Reconciliation */}
      <BalanceReconciliation
        creditCardId={cardId}
        statementClosingDay={cardData.statementClosingDay}
      />

      {/* Section 2: APR Breakdown */}
      <AprBreakdown aprs={cardData.aprs ?? undefined} />

      {/* Two-column grid on desktop: financial insights left, reference right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[7fr_5fr]">
        {/* Left: Actionable financial insights */}
        <div className="flex flex-col gap-6">
          <InterestSavingBalance
            creditCardId={cardId}
            purchaseAprPercentage={getPurchaseApr(cardData.aprs ?? undefined)}
          />
          <FeesInterestYtd creditCardId={cardId} />
          <PromoTracker creditCardId={cardId} />
          <PayOverTimeSection
            payOverTimeEnabled={cardData.payOverTimeEnabled ?? undefined}
            payOverTimeLimit={cardData.payOverTimeLimit ?? undefined}
            payOverTimeApr={cardData.payOverTimeApr ?? undefined}
            availableCredit={cardData.availableCredit ?? undefined}
          />
        </div>

        {/* Right: Reference & status */}
        <div className="flex flex-col gap-6">
          {/* Account Details */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-primary">Account Details</h3>
            <div className="rounded-xl border border-secondary bg-primary">
              <dl className="divide-y divide-secondary">
                {cardData.officialName && (
                  <DetailRow label="Official Name" value={cardData.officialName} />
                )}
                <DetailRow label="Account Name" value={cardData.accountName} />
                {cardData.company && (
                  <DetailRow label="Issuer" value={cardData.company} />
                )}
                {cardData.brand && (
                  <DetailRow
                    label="Network"
                    value={cardData.brand.charAt(0).toUpperCase() + cardData.brand.slice(1)}
                  />
                )}
                {cardData.lastFour && (
                  <DetailRow label="Card Number" value={`•••• •••• •••• ${cardData.lastFour}`} />
                )}
                {cardData.accountType && (
                  <DetailRow
                    label="Account Type"
                    value={`${cardData.accountType}${cardData.accountSubtype ? ` / ${cardData.accountSubtype}` : ""}`.replace(/\b\w/g, c => c.toUpperCase())}
                  />
                )}
                {cardData.isoCurrencyCode && (
                  <DetailRow label="Currency" value={cardData.isoCurrencyCode} />
                )}
                <DetailRow
                  label="Date Added"
                  value={new Date(cardData._creationTime).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                />
                {cardData.statementClosingDay != null && (
                  <DetailRow label="Statement Closing Day" value={`Day ${cardData.statementClosingDay}`} />
                )}
              </dl>
            </div>
          </section>

          {/* Payment History — stacked vertically for narrower column */}
          <section>
            <h3 className="mb-4 text-lg font-semibold text-primary">Payment History</h3>
            <div className="rounded-xl border border-secondary bg-primary">
              <div className="grid grid-cols-1 divide-y divide-secondary">
                <div className="p-4">
                  <p className="text-xs text-tertiary">Last Payment</p>
                  <p className="text-lg font-semibold tabular-nums text-primary">
                    {cardData.lastPaymentAmount != null
                      ? formatDisplayCurrency(cardData.lastPaymentAmount)
                      : "\u2014"}
                  </p>
                  {cardData.lastPaymentDate && (
                    <p className="text-xs text-tertiary">{cardData.lastPaymentDate}</p>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-tertiary">Last Statement Balance</p>
                  <p className="text-lg font-semibold tabular-nums text-primary">
                    {cardData.lastStatementBalance != null
                      ? formatDisplayCurrency(cardData.lastStatementBalance)
                      : "\u2014"}
                  </p>
                  {cardData.lastStatementIssueDate && (
                    <p className="text-xs text-tertiary">Issued {cardData.lastStatementIssueDate}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Sync Status */}
          {cardData.syncStatus && (
            <section>
              <h3 className="mb-4 text-lg font-semibold text-primary">Sync Status</h3>
              <div className="rounded-xl border border-secondary bg-primary px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-tertiary">Status</span>
                  <span
                    className={cx(
                      "text-sm font-medium",
                      cardData.syncStatus === "synced" && "text-utility-success-700",
                      cardData.syncStatus === "syncing" && "text-utility-brand-600",
                      cardData.syncStatus === "error" && "text-utility-error-700",
                      cardData.syncStatus === "stale" && "text-utility-warning-700",
                    )}
                  >
                    {cardData.syncStatus.charAt(0).toUpperCase() + cardData.syncStatus.slice(1)}
                  </span>
                </div>
                {cardData.lastSyncedAt && (
                  <p className="mt-1 text-xs text-tertiary">
                    Last synced: {new Date(cardData.lastSyncedAt).toLocaleString("en-US")}
                  </p>
                )}
                {cardData.lastSyncError && (
                  <div className="mt-2 rounded-lg bg-utility-error-50 px-3 py-2 text-xs text-utility-error-700">
                    {cardData.lastSyncError}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-sm text-tertiary">{label}</dt>
      <dd className="text-sm font-medium text-primary">{value}</dd>
    </div>
  );
}
