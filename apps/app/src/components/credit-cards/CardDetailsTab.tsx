"use client";

import { motion } from "motion/react";
import type { Id } from "@convex/_generated/dataModel";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { formatDisplayCurrency } from "@/types/credit-cards";

interface AprInfo {
  aprPercentage: number;
  aprType: string;
  balanceSubjectToApr?: number;
  interestChargeAmount?: number;
}

interface CardData {
  _id: Id<"creditCards">;
  _creationTime: number;
  officialName?: string;
  accountName: string;
  accountType?: string;
  accountSubtype?: string;
  aprs?: AprInfo[];
  lastPaymentAmount?: number;
  lastPaymentDate?: string;
  lastStatementBalance?: number;
  lastStatementIssueDate?: string;
  syncStatus?: "synced" | "syncing" | "error" | "stale";
  lastSyncedAt?: number;
  lastSyncError?: string;
  company?: string;
  brand?: string;
  lastFour?: string;
  isoCurrencyCode?: string;
}

interface CardDetailsTabProps {
  cardId: Id<"creditCards">;
  cardData: CardData | null | undefined;
}

/**
 * Card Details Tab - Shows APR breakdown, account info, and payment history
 */
export function CardDetailsTab({ cardId, cardData }: CardDetailsTabProps) {
  if (!cardData) {
    return (
      <div className="py-12 text-center text-tertiary">
        Card details not available
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
      {/* APR Breakdown */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">APR Information</h3>
        <div className="rounded-xl border border-secondary bg-primary">
          {cardData.aprs && cardData.aprs.length > 0 ? (
            <div className="divide-y divide-secondary">
              {cardData.aprs.map((apr, index) => (
                <AprRow key={index} apr={apr} />
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-tertiary">
              No APR information available
            </div>
          )}
        </div>
      </section>

      {/* Payment History */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">Payment History</h3>
        <div className="rounded-xl border border-secondary bg-primary">
          <div className="grid grid-cols-1 divide-y divide-secondary sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {/* Last Payment */}
            <div className="p-4">
              <p className="text-sm font-medium text-tertiary">Last Payment</p>
              <p className="mt-1 text-xl font-semibold text-primary tabular-nums">
                {cardData.lastPaymentAmount != null
                  ? formatDisplayCurrency(cardData.lastPaymentAmount)
                  : "--"}
              </p>
              <p className="mt-1 text-xs text-tertiary">
                {cardData.lastPaymentDate
                  ? formatDate(cardData.lastPaymentDate)
                  : "No payment on record"}
              </p>
            </div>

            {/* Last Statement */}
            <div className="p-4">
              <p className="text-sm font-medium text-tertiary">Last Statement Balance</p>
              <p className="mt-1 text-xl font-semibold text-primary tabular-nums">
                {cardData.lastStatementBalance != null
                  ? formatDisplayCurrency(cardData.lastStatementBalance)
                  : "--"}
              </p>
              <p className="mt-1 text-xs text-tertiary">
                {cardData.lastStatementIssueDate
                  ? `Issued ${formatDate(cardData.lastStatementIssueDate)}`
                  : "No statement on record"}
              </p>
            </div>
          </div>
        </div>
      </section>

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
                value={`${cardData.accountType}${cardData.accountSubtype ? ` / ${cardData.accountSubtype}` : ""}`}
              />
            )}
            {cardData.isoCurrencyCode && (
              <DetailRow label="Currency" value={cardData.isoCurrencyCode} />
            )}
            <DetailRow
              label="Added"
              value={formatDateTime(cardData._creationTime)}
            />
          </dl>
        </div>
      </section>

      {/* Sync Status */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-primary">Sync Status</h3>
        <div className="rounded-xl border border-secondary bg-primary p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-tertiary">Status</p>
              <div className="mt-1 flex items-center gap-2">
                <SyncStatusBadge status={cardData.syncStatus} />
                {cardData.lastSyncedAt && (
                  <span className="text-xs text-tertiary">
                    Last synced {formatRelativeTime(cardData.lastSyncedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
          {cardData.lastSyncError && (
            <p className="mt-3 rounded-lg bg-utility-error-50 p-3 text-sm text-utility-error-700">
              {cardData.lastSyncError}
            </p>
          )}
        </div>
      </section>
    </motion.div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function AprRow({ apr }: { apr: AprInfo }) {
  const aprLabel = formatAprType(apr.aprType);

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="text-sm font-medium text-primary">{aprLabel}</p>
        {apr.balanceSubjectToApr !== undefined && apr.balanceSubjectToApr > 0 && (
          <p className="text-xs text-tertiary">
            Balance: {formatDisplayCurrency(apr.balanceSubjectToApr)}
          </p>
        )}
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-primary tabular-nums">
          {apr.aprPercentage.toFixed(2)}%
        </p>
        {apr.interestChargeAmount !== undefined && apr.interestChargeAmount > 0 && (
          <p className="text-xs text-utility-error-600">
            Interest: {formatDisplayCurrency(apr.interestChargeAmount)}
          </p>
        )}
      </div>
    </div>
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

function SyncStatusBadge({ status }: { status?: string }) {
  switch (status) {
    case "synced":
      return <Badge color="success" size="sm">Synced</Badge>;
    case "syncing":
      return <Badge color="blue" size="sm">Syncing</Badge>;
    case "error":
      return <Badge color="error" size="sm">Error</Badge>;
    case "stale":
      return <Badge color="warning" size="sm">Stale</Badge>;
    default:
      return <Badge color="gray" size="sm">Unknown</Badge>;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatAprType(aprType: string): string {
  const typeMap: Record<string, string> = {
    purchase_apr: "Purchase APR",
    balance_transfer_apr: "Balance Transfer APR",
    cash_advance_apr: "Cash Advance APR",
    penalty_apr: "Penalty APR",
    prime_rate: "Prime Rate",
    special: "Special APR",
  };

  return typeMap[aprType.toLowerCase()] || aprType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;

  return formatDateTime(timestamp);
}
