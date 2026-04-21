// apps/app/src/app/(app)/dashboard/components/ConnectedBanks.tsx
"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { AlertTriangle, Building07, Settings01 } from "@untitledui/icons";
import { cx } from "@repo/ui/utils";
import Link from "next/link";
import { useState } from "react";

function formatCurrency(amount: number): string {
  return (amount / 1000).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatSyncTime(timestamp?: number): string {
  if (!timestamp) return "Never synced";
  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Synced just now";
  if (hours < 24) return `Synced ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Synced ${days}d ago`;
}

export function ConnectedBanks() {
  const { isAuthenticated } = useConvexAuth();
  const banks = useQuery(
    api.dashboard.queries.getConnectedBanks,
    isAuthenticated ? {} : "skip"
  );
  const [expandedBanks, setExpandedBanks] = useState<Set<string>>(new Set());

  if (!banks) {
    return (
      <div className="rounded-xl border border-primary bg-primary p-5">
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Connected Banks
        </h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  const toggleExpand = (itemId: string) => {
    setExpandedBanks((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const visibleBanks = banks.slice(0, 4);
  const hiddenCount = banks.length - 4;

  return (
    <div className="rounded-xl border border-primary bg-primary p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">Connected Banks</h3>
        <Link
          href="/settings/institutions"
          className="text-tertiary hover:text-secondary"
        >
          <Settings01 className="size-5" />
        </Link>
      </div>

      {banks.length === 0 ? (
        <p className="text-sm text-tertiary">No banks connected</p>
      ) : (
        <div className="space-y-3">
          {visibleBanks.map((bank) => {
            const isExpanded = expandedBanks.has(bank.itemId);
            // W4: needsAttention keyed on recommendedAction (derivation owns
            // the classification; UI just consumes). null = no CTA needed.
            const needsAttention = bank.recommendedAction != null;
            // Short summary label keyed on recommendedAction. Full copy
            // (title/description/ctaLabel) comes from reasonCodeToUserCopy
            // for settings pages and other richer surfaces.
            const attentionLabel =
              bank.recommendedAction === "reconnect"
                ? "Reconnect needed"
                : bank.recommendedAction === "reconnect_for_new_accounts"
                  ? "New accounts available"
                  : bank.recommendedAction === "wait"
                    ? "Retrying"
                    : bank.recommendedAction === "contact_support"
                      ? "Sync error"
                      : null;

            return (
              <div key={bank.itemId}>
                <button
                  onClick={() => toggleExpand(bank.itemId)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <Building07 className="size-5 text-tertiary" />
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {bank.institutionName}
                      </p>
                      <p
                        className={cx(
                          "text-xs",
                          needsAttention ? "text-warning-600" : "text-tertiary"
                        )}
                      >
                        {needsAttention && attentionLabel ? (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="size-3" />
                            {attentionLabel}
                          </span>
                        ) : (
                          formatSyncTime(bank.lastSyncedAt)
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-tertiary">
                    {bank.accounts.length} account
                    {bank.accounts.length !== 1 ? "s" : ""}
                  </span>
                </button>

                {isExpanded && (
                  <div className="ml-8 mt-1 space-y-1 border-l border-border-secondary pl-4">
                    {bank.accounts.map((acc) => (
                      <div
                        key={acc.accountId}
                        className="flex items-center justify-between py-1 text-sm"
                      >
                        <span className="text-secondary">
                          {acc.name}
                          {acc.mask && (
                            <span className="ml-1 text-tertiary">
                              ••••{acc.mask}
                            </span>
                          )}
                        </span>
                        <span className="text-tertiary">
                          {acc.balance != null
                            ? formatCurrency(acc.balance)
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {hiddenCount > 0 && (
            <Link
              href="/settings/institutions"
              className="block text-center text-sm text-tertiary hover:text-secondary"
            >
              +{hiddenCount} more institution{hiddenCount !== 1 ? "s" : ""}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
