"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { motion } from "motion/react";
import { CreditCardsHeader } from "./CreditCardsHeader";
import { CreditCardsFilterBar } from "./CreditCardsFilterBar";
import { UntitledCardGridItem } from "./UntitledCardGridItem";
import { AddCardsSlideout } from "@/components/wallets/AddCardsSlideout";
import { PlaidLinkButton } from "@/features/institutions";
import { ExtendedViewProvider, useExtendedView } from "@/hooks/useExtendedView";
import { useCardFiltering } from "@/hooks/useCardFiltering";
import { useSharedLayoutAnimation } from "@/lib/context/shared-layout-animation-context";
import type { CardFilters } from "@/types/credit-cards";
import { DEFAULT_CARD_FILTERS, toExtendedCreditCard } from "@/types/credit-cards";

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Main content component for the credit cards page
 *
 * Handles:
 * - Data display (currently mock, will be Convex later)
 * - Grid layout rendering
 * - Extended view toggle
 */
export function CreditCardsContent() {
  return (
    <ExtendedViewProvider>
      <CreditCardsContentInner />
    </ExtendedViewProvider>
  );
}

function CreditCardsContentInner() {
  const { isExtended, toggleExtended } = useExtendedView();
  const [filters, setFilters] = useState<CardFilters>(DEFAULT_CARD_FILTERS);
  const [isAddCardsOpen, setIsAddCardsOpen] = useState(false);
  const { user } = useUser();
  const { animatingCardId, endAnimation } = useSharedLayoutAnimation();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Check for wallet filter from URL
  const walletIdParam = searchParams.get("wallet");
  const walletId = walletIdParam as Id<"wallets"> | null;

  // Fetch wallet info if filtering by wallet
  const walletInfo = useQuery(
    api.wallets.queries.get,
    walletId ? { walletId } : "skip"
  );

  // Fetch credit cards - use wallet-filtered query if wallet param exists
  const allCardsData = useQuery(
    api.creditCards.queries.list,
    walletId ? "skip" : {}
  );
  const walletCardsData = useQuery(
    api.wallets.cardQueries.listByWallet,
    walletId ? { walletId } : "skip"
  );

  // Use the appropriate data source
  const cardsData = walletId ? walletCardsData : allCardsData;
  const cardholderName = user?.fullName ?? user?.firstName ?? "Card Holder";

  // Convert API data to extended format for UI
  const cards = useMemo(() => {
    if (!cardsData) return [];
    return cardsData.map((card) => toExtendedCreditCard(card, cardholderName));
  }, [cardsData, cardholderName]);

  // Apply filtering and sorting
  const filteredCards = useCardFiltering(cards, filters);

  // Loading state
  const isLoading = cardsData === undefined;

  // Clear wallet filter and navigate to all cards
  const handleClearWallet = useCallback(() => {
    router.push("/credit-cards");
  }, [router]);

  // Open Add Cards slideout
  const handleOpenAddCards = useCallback(() => {
    setIsAddCardsOpen(true);
  }, []);

  const handlePlaidLinkSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  const creditCardProducts = useMemo(() => ["transactions", "liabilities"], []);
  const creditCardAccountFilters = useMemo(
    () => ({
      credit: {
        account_subtypes: ["credit card"],
      },
    }),
    []
  );

  return (
    <div className="flex h-full flex-col">
      <CreditCardsHeader
        walletName={walletInfo?.name}
        addCreditCardAction={
          <PlaidLinkButton
            size="sm"
            buttonLabel="Add Credit Card"
            products={creditCardProducts}
            accountFilters={creditCardAccountFilters}
            onSuccess={handlePlaidLinkSuccess}
          />
        }
        onAddCardsToWallet={walletId ? handleOpenAddCards : undefined}
      />

      <CreditCardsFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={cards.length}
        filteredCount={filteredCards.length}
        isExtended={isExtended}
        onExtendedChange={toggleExtended}
        walletName={walletInfo?.name}
        onClearWallet={walletId ? handleClearWallet : undefined}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <CreditCardsGridSkeleton
            animatingCardId={animatingCardId}
            onAnimationComplete={endAnimation}
          />
        ) : filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-primary">No credit cards found</p>
            <p className="mt-1 text-sm text-tertiary">
              {cards.length === 0
                ? walletId
                  ? "This wallet has no cards yet"
                  : "Connect a bank account to see your credit cards"
                : "Try adjusting your filters"}
            </p>
            {cards.length === 0 && !walletId && (
              <PlaidLinkButton
                className="mt-4"
                buttonLabel="Add Credit Card"
                products={creditCardProducts}
                accountFilters={creditCardAccountFilters}
                onSuccess={handlePlaidLinkSuccess}
              />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((card) => (
              <UntitledCardGridItem
                key={card.id}
                card={card}
                isExtended={isExtended}
                walletId={walletId ?? undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Cards Slideout - only rendered when viewing a wallet */}
      {walletId && walletInfo && (
        <AddCardsSlideout
          walletId={walletId}
          walletName={walletInfo.name}
          isOpen={isAddCardsOpen}
          onClose={() => setIsAddCardsOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Skeleton loading state for the grid
 * When animatingCardId is provided, renders a placeholder with matching layoutId
 * to maintain shared element animation continuity during loading
 */
interface CreditCardsGridSkeletonProps {
  animatingCardId?: string | null;
  onAnimationComplete?: () => void;
}

export function CreditCardsGridSkeleton({
  animatingCardId,
  onAnimationComplete,
}: CreditCardsGridSkeletonProps) {
  return (
    <div className="flex flex-wrap gap-4 justify-start">
      {/* Animated card placeholder - renders first with matching layoutId */}
      {animatingCardId && (
        <motion.div
          layoutId={`card-${animatingCardId}`}
          layout
          onLayoutAnimationComplete={onAnimationComplete}
          className="inline-block w-[280px]"
        >
          <div className="aspect-[1.586/1] w-full rounded-xl bg-gradient-to-br from-tertiary/30 to-tertiary/10 animate-pulse" />
        </motion.div>
      )}
      {/* Regular skeleton cards */}
      {[...Array(animatingCardId ? 5 : 6)].map((_, i) => (
        <div
          key={i}
          className="inline-block w-[280px] animate-pulse"
        >
          {/* Card visual skeleton */}
          <div className="aspect-[1.586/1] w-full rounded-xl bg-tertiary/20" />
        </div>
      ))}
    </div>
  );
}
