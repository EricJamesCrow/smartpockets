"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
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
import { CreditCardStatusBadge } from "./CreditCardStatusBadge";
import { PaymentDueBadge } from "./PaymentDueBadge";
import { KeyMetrics } from "./KeyMetrics";
import { AutoPayToggle, useAutoPay } from "./AutoPayToggle";
import { Badge } from "@repo/ui/untitledui/base/badges/badges";
import { TransactionsSection } from "./TransactionsSection";
import { CardDetailsTab } from "./CardDetailsTab";
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
              onClick={() => toggleLock(cardId, card.isLocked)}
              disabled={isLocking}
              aria-label={card.isLocked ? "Unlock card" : "Lock card"}
              className="disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Badge
                type="pill-color"
                color={card.isLocked ? "warning" : "gray"}
                size="sm"
              >
                {isLocking ? "Updating..." : card.isLocked ? "Lock: On" : "Lock: Off"}
              </Badge>
            </button>
            <CreditCardStatusBadge
              isLocked={card.isLocked}
              isActive={card.isActive}
              isOverdue={card.isOverdue}
            />
          </div>
        </div>

        {/* Card Title and Subtitle */}
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary lg:text-3xl">
              {card.cardName}
            </h1>
            <p className="mt-1 text-sm text-tertiary">
              CREDIT • {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} •••• {card.lastFour}
            </p>
          </div>

          {/* Payment Due Info & AutoPay */}
          <div className="flex items-end gap-6">
            <AutoPayToggle
              enabled={autoPay.enabled}
              onToggle={autoPay.toggle}
              isLoading={autoPay.isLoading}
            />
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-tertiary">
                Payment Due
              </span>
              <span className="text-base font-semibold text-primary">
                {card.nextPaymentDueDate ? formatDueDate(card.nextPaymentDueDate) : "--"}
              </span>
              <PaymentDueBadge
                nextPaymentDueDate={card.nextPaymentDueDate}
                isOverdue={card.isOverdue}
              />
            </div>
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
          <nav className="flex gap-6" aria-label="Card detail tabs">
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
