"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { motion } from "motion/react";
import { CreditCard02 } from "@untitledui/icons";
import { cx } from "@repo/ui/utils";
import { Breadcrumbs } from "@repo/ui/untitledui/application/breadcrumbs/breadcrumbs";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { useToggleCardLocked } from "@/hooks/useToggleCardLocked";
import { UntitledCardVisual } from "./UntitledCardVisual";
import { CardSchemaPanel } from "./CardSchemaPanel";
import { CreditCardStatusBadge } from "./CreditCardStatusBadge";
import { PaymentDueBadge } from "./PaymentDueBadge";
import { KeyMetrics } from "./KeyMetrics";
import { useAutoPay } from "./AutoPayToggle";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { TransactionsSection } from "./TransactionsSection";
import { CardDetailsTab } from "./CardDetailsTab";
import { InlineEditableField } from "./details/InlineEditableField";
import { useSharedLayoutAnimation } from "@/lib/context/shared-layout-animation-context";
import {
  formatDueDate,
  toExtendedCreditCard,
} from "@/types/credit-cards";

type TabId = "overview" | "details" | "transactions" | "subscriptions";

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface CreditCardDetailContentProps {
  cardId: Id<"creditCards">;
}

/**
 * Detail page content component for a single credit card
 *
 * Fetches card data from Convex and displays detailed information.
 */
export function CreditCardDetailContent({ cardId }: CreditCardDetailContentProps) {
  const router = useRouter();
  const { startAnimation, endAnimation } = useSharedLayoutAnimation();
  const { user } = useUser();
  const cardIdStr = cardId as string;

  // Tab state
  const [selectedTab, setSelectedTab] = useState<TabId>("overview");

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "details", label: "Details" },
    { id: "transactions", label: "Transactions" },
    { id: "subscriptions", label: "Subscriptions" },
  ];

  const { toggle: toggleLock, isLoading: isLocking } = useToggleCardLocked();
  const setOverride = useMutation(api.creditCards.mutations.setOverride);
  const clearOverride = useMutation(api.creditCards.mutations.clearOverride);

  const handleBack = () => {
    startAnimation(cardIdStr);
    router.push("/credit-cards");
  };

  // Fetch credit card from Convex
  const cardData = useQuery(api.creditCards.queries.get, { cardId });
  const cardholderName = user?.fullName ?? user?.firstName ?? "Card Holder";

  // Convert API data to extended format for UI
  const card = useMemo(() => {
    if (!cardData) return null;
    return toExtendedCreditCard(cardData, cardholderName);
  }, [cardData, cardholderName]);

  // AutoPay state - pass cardId and current isAutoPay value from server
  const autoPay = useAutoPay(cardData ? cardId : null, cardData?.isAutoPay ?? false);

  // Loading state - maintain layoutId for shared element animation
  if (cardData === undefined) {
    return (
      <motion.div
        key={`card-detail-${cardId}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-full flex-col"
      >
        <div className="border-b border-secondary bg-primary px-4 py-3 lg:px-6">
          <div className="flex items-center gap-2 animate-pulse">
            <div className="h-4 w-16 rounded bg-tertiary/20" />
            <div className="h-4 w-4 rounded bg-tertiary/10" />
            <div className="h-4 w-24 rounded bg-tertiary/20" />
            <div className="h-4 w-4 rounded bg-tertiary/10" />
            <div className="h-4 w-32 rounded bg-tertiary/30" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
          <div className="flex justify-center py-4">
            <motion.div
              layoutId={`card-${cardId}`}
              layout="position"
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                duration: 0.4,
              }}
              className="w-full max-w-[400px]"
            >
              <div className="aspect-[1.586/1] w-full rounded-xl bg-gradient-to-br from-tertiary/30 to-tertiary/10 animate-pulse" />
            </motion.div>
          </div>
          {/* Metrics skeleton */}
          <div className="mt-8 flex items-center justify-between border-y border-secondary py-6 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="h-3 w-20 rounded bg-tertiary/20" />
                <div className="h-7 w-24 rounded bg-tertiary/30" />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // Not found state
  if (!card) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <h2 className="text-lg font-semibold text-primary">Card Not Found</h2>
        <p className="mt-2 text-sm text-tertiary">
          The requested card could not be found.
        </p>
        <Button
          color="secondary"
          size="sm"
          className="mt-4"
          onClick={handleBack}
        >
          Back to Cards
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      key={`card-detail-${cardId}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onAnimationComplete={() => endAnimation()}
      className="flex h-full flex-col"
    >
      {/* Header with Card Info and Payment Due */}
      <div className="border-b border-secondary bg-primary px-4 py-4 lg:px-6">
        <div className="flex items-center justify-between">
          {/* Left: Breadcrumbs */}
          <Breadcrumbs divider="chevron">
            <Breadcrumbs.Item href="/credit-cards" icon={CreditCard02} onClick={handleBack}>
              Credit Cards
            </Breadcrumbs.Item>
            <Breadcrumbs.Item>
              {card.cardName}
            </Breadcrumbs.Item>
          </Breadcrumbs>

          {/* Right: Status Badges */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => autoPay.toggle(!autoPay.enabled)}
              disabled={autoPay.isLoading}
              aria-label={autoPay.enabled ? "Disable AutoPay" : "Enable AutoPay"}
              className="disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Badge
                type="pill-color"
                color={autoPay.enabled ? "success" : "gray"}
                size="sm"
              >
                {autoPay.isLoading ? "Updating..." : autoPay.enabled ? "AutoPay: On" : "AutoPay: Off"}
              </Badge>
            </button>
            <button
              type="button"
              onClick={() => toggleLock(cardId, card.isLocked)}
              disabled={isLocking}
              aria-label={card.isLocked ? "Unlock card" : "Lock card"}
              className="disabled:cursor-not-allowed disabled:opacity-70"
            >
              <CreditCardStatusBadge
                isLocked={card.isLocked}
                isActive={card.isActive}
                isOverdue={card.isOverdue}
              />
            </button>
          </div>
        </div>

        {/* Card Title and Subtitle */}
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-medium leading-tight tracking-[-0.02em] text-primary lg:text-[1.85rem]">
              <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-stone-300 dark:text-stone-300">
                {card.cardName}
              </em>
            </h1>
            <p className="mt-2 sp-kicker text-tertiary dark:text-stone-500">
              <span className="mr-2 inline-block h-1 w-1 -translate-y-0.5 rounded-full bg-[var(--sp-moss-mint)]" />
              CREDIT &middot; {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} &middot; •••• {card.lastFour}
            </p>
            {/* Provider Dashboard Link */}
            <div className="mt-1 flex items-center">
              {cardData?.userOverrides?.providerDashboardUrl ? (
                <ProviderLink
                  url={cardData.userOverrides.providerDashboardUrl}
                  onSave={async (v) => {
                    await setOverride({ cardId, field: "providerDashboardUrl", value: v });
                  }}
                  onClear={async () => {
                    await clearOverride({ cardId, field: "providerDashboardUrl" });
                  }}
                />
              ) : (
                <InlineEditableField
                  value={null}
                  isOverridden={false}
                  type="url"
                  placeholder="+ Add provider link"
                  onSave={async (v) => {
                    await setOverride({ cardId, field: "providerDashboardUrl", value: v });
                  }}
                  className="text-xs text-tertiary"
                />
              )}
            </div>
          </div>

          {/* Payment Due Info */}
          <div className="flex flex-col items-end gap-1">
            <span className="sp-kicker text-tertiary dark:text-stone-500">
              <em className="font-[family-name:var(--font-fraunces)] italic font-medium normal-case tracking-normal text-stone-300 dark:text-stone-300">
                Payment
              </em>{" "}
              due
            </span>
            <span className="text-base font-semibold tabular-nums text-primary">
              {card.nextPaymentDueDate ? formatDueDate(card.nextPaymentDueDate) : "--"}
            </span>
            <PaymentDueBadge
              nextPaymentDueDate={card.nextPaymentDueDate}
              isOverdue={card.isOverdue}
              minimumPaymentAmount={card.minimumPaymentAmount}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Card Visual - Always visible */}
        <div className="flex justify-center px-4 py-6 lg:px-6">
          <UntitledCardVisual card={card} size="lg" />
        </div>

        {/* Tab Navigation - Below card */}
        <div className="border-b border-secondary px-4 lg:px-6">
          <nav className="flex justify-center gap-6" aria-label="Card detail tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id)}
                className={cx(
                  "relative pb-3 text-sm font-semibold transition-colors",
                  selectedTab === tab.id
                    ? "text-utility-brand-600"
                    : "text-tertiary hover:text-secondary"
                )}
              >
                {tab.label}
                {selectedTab === tab.id && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-utility-brand-600" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {/* Overview Tab */}
        {selectedTab === "overview" && (
          <>
            {/* Key Metrics Row */}
            <KeyMetrics card={card} />

            {/* Schema Panel — reactive query preview that mirrors the marketing landing */}
            <div className="px-4 pt-8 lg:px-6">
              <p className="sp-kicker tracking-[0.24em] text-tertiary dark:text-stone-500">
                <span className="mr-2 inline-block h-1 w-1 -translate-y-0.5 rounded-full bg-[var(--sp-moss-mint)]" />
                02 / Schema &middot; live
              </p>
              <h2 className="mt-1.5 text-display-xs font-medium leading-tight tracking-[-0.02em] text-primary">
                <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-stone-300 dark:text-stone-300">
                  Architecture
                </em>{" "}
                under the card.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-tertiary">
                The reactive query feeding this page. WebSocket push, indexed by
                user-card, p95 under 100ms.
              </p>
              <div className="mt-5">
                <CardSchemaPanel card={card} />
              </div>
            </div>

            {/* Transactions Section */}
            <div className="px-4 py-6 lg:px-6">
              <TransactionsSection cardId={cardId} accountId={card.accountId} />
            </div>
          </>
        )}

        {/* Details Tab */}
        {selectedTab === "details" && (
          <div className="px-4 py-6 lg:px-6">
            <CardDetailsTab cardId={cardId} cardData={cardData} />
          </div>
        )}

        {/* Transactions Tab (non-recurring only) */}
        {selectedTab === "transactions" && (
          <div className="px-4 py-6 lg:px-6">
            <TransactionsSection
              cardId={cardId}
              accountId={card.accountId}
              filterMode="transactions"
            />
          </div>
        )}

        {/* Subscriptions Tab (recurring only) */}
        {selectedTab === "subscriptions" && (
          <div className="px-4 py-6 lg:px-6">
            <TransactionsSection
              cardId={cardId}
              accountId={card.accountId}
              filterMode="subscriptions"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function ProviderLink({
  url,
  onSave,
  onClear,
}: {
  url: string;
  onSave: (url: string | number) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu]);

  if (editing) {
    return (
      <InlineEditableField
        value={url}
        plaidValue={undefined}
        isOverridden={true}
        type="url"
        onSave={async (v) => {
          await onSave(v);
          setEditing(false);
        }}
        onRevert={async () => {
          await onClear();
          setEditing(false);
        }}
      />
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1"
      onDoubleClick={() => setEditing(true)}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-utility-brand-600 hover:text-utility-brand-700 hover:underline"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-3 w-3"
        >
          <path
            fillRule="evenodd"
            d="M4.22 11.78a.75.75 0 0 1 0-1.06L9.44 5.5H5.75a.75.75 0 0 1 0-1.5h5.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0V6.56l-5.22 5.22a.75.75 0 0 1-1.06 0Z"
            clipRule="evenodd"
          />
        </svg>
        Provider Dashboard
      </a>
      {contextMenu &&
        createPortal(
          <div
            className="fixed z-50 rounded-lg border border-secondary bg-primary py-1 text-sm shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              className="w-full cursor-pointer px-3 py-1.5 text-left text-primary hover:bg-secondary"
              onClick={() => {
                setContextMenu(null);
                setEditing(true);
              }}
            >
              Edit link
            </button>
            <button
              type="button"
              className="w-full cursor-pointer px-3 py-1.5 text-left text-utility-error-700 hover:bg-secondary"
              onClick={async () => {
                setContextMenu(null);
                await onClear();
              }}
            >
              Remove link
            </button>
          </div>,
          document.body
        )}
    </span>
  );
}
