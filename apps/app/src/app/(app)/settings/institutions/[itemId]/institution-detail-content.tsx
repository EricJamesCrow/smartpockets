"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building07,
  RefreshCw01,
  LinkBroken01,
  CreditCard02,
  Calendar,
  Check,
} from "@untitledui/icons";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { FeaturedIcon } from "@repo/ui/untitledui/foundations/featured-icon/featured-icon";
import { DisconnectBankModal } from "@/features/institutions";

interface InstitutionDetailContentProps {
  itemId: string;
}

/**
 * Format balance for display.
 * Plaid component stores balances in millicents (integer), so divide by 1000.
 * Uses locale formatting for proper comma separators.
 */
function formatBalance(rawValue: number | null | undefined): string {
  if (rawValue == null) return "$0.00";
  const dollars = rawValue / 1000;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Institution Detail Content
 *
 * Shows detailed information about a connected banking institution.
 * Features:
 * - Back navigation
 * - Institution header with stats
 * - Manual refresh action
 * - Disconnect button with confirmation modal
 * - Account list by type
 */
export function InstitutionDetailContent({
  itemId,
}: InstitutionDetailContentProps) {
  const router = useRouter();
  const { user } = useUser();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Fetch item data (using internal query via component)
  const plaidItems = useQuery(
    api.items.queries.getItemsByUserId,
    user?.id ? { userId: user.id } : "skip"
  );

  // Find the specific item
  const item = plaidItems?.find((i) => i._id === itemId);

  // Fetch accounts for this item
  const accounts = useQuery(
    api.plaidComponent.getAccountsByPlaidItemId,
    item ? { plaidItemId: item._id } : "skip"
  );

  // Sync action
  const syncTransactions = useAction(api.plaidComponent.syncTransactionsAction);
  const fetchLiabilities = useAction(api.plaidComponent.fetchLiabilitiesAction);
  const syncCreditCards = useAction(api.creditCards.actions.syncCreditCardsAction);

  const handleRefresh = async () => {
    if (!item || !user?.id) return;

    setIsRefreshing(true);
    const toastId = toast.loading("Refreshing data...");

    try {
      // Sync transactions
      await syncTransactions({ plaidItemId: item._id });

      // Fetch liabilities
      await fetchLiabilities({ plaidItemId: item._id });

      // Sync credit cards (userId derived from auth server-side)
      await syncCreditCards({ plaidItemId: item._id });

      toast.success("Data refreshed!", { id: toastId });
    } catch (error) {
      console.error("Refresh failed:", error);
      toast.error("Failed to refresh data", { id: toastId });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 lg:px-8">
        <FeaturedIcon
          theme="outline"
          color="gray"
          size="xl"
          icon={Building07}
        />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-primary">
            Institution not found
          </h3>
          <p className="text-sm text-tertiary">
            This institution may have been disconnected.
          </p>
        </div>
        <Button
          color="secondary"
          onClick={() => router.push("/settings/institutions")}
          iconLeading={ArrowLeft}
        >
          Back to Institutions
        </Button>
      </div>
    );
  }

  const isActive = item.isActive !== false;
  const hasError = !!item.syncError;
  const createdAt = new Date(item.createdAt).toLocaleDateString();
  const lastSynced = item.lastSyncedAt
    ? new Date(item.lastSyncedAt).toLocaleDateString()
    : "Never";

  // Group accounts by type
  const creditAccounts = accounts?.filter((a) => a.type === "credit") ?? [];
  const depositoryAccounts = accounts?.filter((a) => a.type === "depository") ?? [];
  const loanAccounts = accounts?.filter((a) => a.type === "loan") ?? [];

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-8">
      {/* Back navigation */}
      <Button
        color="link-gray"
        size="sm"
        onClick={() => router.push("/settings/institutions")}
        iconLeading={ArrowLeft}
        className="-ml-2 w-fit"
      >
        Back to Institutions
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-6 rounded-xl border border-secondary bg-primary p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 shadow-sm ring-1 ring-secondary ring-inset">
              <Building07 className="size-7 text-gray-500" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-primary">
                  {item.institutionName || "Unknown Institution"}
                </h1>
                {!isActive && (
                  <Badge color="gray" size="md">
                    Paused
                  </Badge>
                )}
                {hasError && (
                  <Badge color="error" size="md">
                    Error
                  </Badge>
                )}
              </div>
              <p className="text-sm text-tertiary">
                Connected on {createdAt}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              color="secondary"
              size="md"
              onClick={handleRefresh}
              isLoading={isRefreshing}
              iconLeading={RefreshCw01}
            >
              Refresh Now
            </Button>
            <Button
              color="tertiary"
              size="md"
              onClick={() => setShowDisconnectModal(true)}
              iconLeading={LinkBroken01}
            >
              Disconnect
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg bg-secondary p-4">
            <FeaturedIcon
              theme="light"
              color="brand"
              size="md"
              icon={CreditCard02}
            />
            <div>
              <p className="text-2xl font-semibold text-primary">
                {accounts?.length ?? 0}
              </p>
              <p className="text-sm text-tertiary">Total Accounts</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-secondary p-4">
            <FeaturedIcon
              theme="light"
              color="brand"
              size="md"
              icon={Calendar}
            />
            <div>
              <p className="text-2xl font-semibold text-primary">{lastSynced}</p>
              <p className="text-sm text-tertiary">Last Synced</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-secondary p-4">
            <FeaturedIcon
              theme="light"
              color="brand"
              size="md"
              icon={Check}
            />
            <div>
              <p className="text-2xl font-semibold text-primary">
                {item.products?.length ?? 0}
              </p>
              <p className="text-sm text-tertiary">Products</p>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Card Accounts */}
      {creditAccounts.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-primary">Credit Cards</h2>
          <div className="flex flex-col gap-2">
            {creditAccounts.map((account) => (
              <div
                key={account._id}
                className="flex items-center justify-between rounded-lg border border-secondary bg-primary p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100">
                    <CreditCard02 className="size-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">{account.name}</p>
                    <p className="text-sm text-tertiary">
                      •••• {account.mask || "----"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">
                    {formatBalance(account.balances.current)}
                  </p>
                  <p className="text-sm text-tertiary">Current Balance</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bank Accounts */}
      {depositoryAccounts.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-primary">Bank Accounts</h2>
          <div className="flex flex-col gap-2">
            {depositoryAccounts.map((account) => (
              <div
                key={account._id}
                className="flex items-center justify-between rounded-lg border border-secondary bg-primary p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100">
                    <Building07 className="size-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">{account.name}</p>
                    <p className="text-sm text-tertiary">
                      •••• {account.mask || "----"} • {account.subtype}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">
                    {formatBalance(account.balances.available)}
                  </p>
                  <p className="text-sm text-tertiary">Available</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loans */}
      {loanAccounts.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-primary">Loans</h2>
          <div className="flex flex-col gap-2">
            {loanAccounts.map((account) => (
              <div
                key={account._id}
                className="flex items-center justify-between rounded-lg border border-secondary bg-primary p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100">
                    <Building07 className="size-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">{account.name}</p>
                    <p className="text-sm text-tertiary">
                      •••• {account.mask || "----"} • {account.subtype}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">
                    {formatBalance(account.balances.current)}
                  </p>
                  <p className="text-sm text-tertiary">Balance</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disconnect Modal */}
      <DisconnectBankModal
        open={showDisconnectModal}
        onOpenChange={setShowDisconnectModal}
        item={{
          _id: item._id,
          institutionName: item.institutionName,
          accountCount: accounts?.length ?? 0,
        }}
      />
    </div>
  );
}
