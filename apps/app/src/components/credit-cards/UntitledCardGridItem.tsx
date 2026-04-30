"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { XClose } from "@untitledui/icons";
import { cx } from "@repo/ui/utils";
import { UntitledCreditCard } from "./UntitledCreditCard";
import { UtilizationBar } from "./UtilizationProgress";
import { useSharedLayoutAnimation } from "@/lib/context/shared-layout-animation-context";
import {
  SHARED_LAYOUT_ANIMATIONS,
  CARD_GRID_ANIMATIONS,
} from "@/lib/constants/animations";
import {
  formatApr,
  formatDisplayCurrency,
  formatDueDate,
  type ExtendedCreditCardData,
} from "@/types/credit-cards";
import { PaymentDueBadge } from "./PaymentDueBadge";

interface UntitledCardGridItemProps {
  card: ExtendedCreditCardData;
  isExtended: boolean;
  className?: string;
  /** When provided, shows "Remove from wallet" action */
  walletId?: Id<"wallets">;
}

/**
 * Grid item component for displaying a credit card using UntitledUI visual
 *
 * - Minimal mode: Just the card visual
 * - Extended mode: Card + info below (constrained to card width)
 *
 * Features:
 * - Shared element transitions via layoutId
 * - Hover/tap scale animations
 * - Fade out non-current cards during animation
 * - Route prefetching on mouse enter
 * - Keyboard accessibility
 */
export function UntitledCardGridItem({
  card,
  isExtended,
  className,
  walletId,
}: UntitledCardGridItemProps) {
  const router = useRouter();
  const { isAnimating, animatingCardId, startAnimation } =
    useSharedLayoutAnimation();

  // Track if this is the initial mount (for stagger animation on first load)
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  useEffect(() => {
    setHasAnimatedIn(true);
  }, []);

  // Cursor-spotlit hover — set --mouse-x/--mouse-y as percentages on the host.
  // The radial gradient is rendered by `.apothecary-spotlight::before`.
  const spotlightRef = useRef<HTMLDivElement>(null);
  const handleSpotlight = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const node = spotlightRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    node.style.setProperty("--mouse-x", `${x.toFixed(1)}%`);
    node.style.setProperty("--mouse-y", `${y.toFixed(1)}%`);
  }, []);

  // Remove from wallet mutation
  const removeFromWallet = useMutation(api.wallets.walletCards.removeCard);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemoveFromWallet = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!walletId || isRemoving) return;

    setIsRemoving(true);
    try {
      await removeFromWallet({
        walletId,
        cardId: card.id as Id<"creditCards">,
      });
    } catch (error) {
      console.error("Failed to remove card from wallet:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  const cardIdStr = card.id as string;
  const sharedLayoutId = `card-${cardIdStr}`;
  const isCurrentCard = animatingCardId === cardIdStr;
  const shouldFadeOut = isAnimating && !isCurrentCard;
  const hoverEnabled = !isAnimating;

  // Skip initial animation for shared layout transitions (when navigating back)
  // Only show initial fade-in on first page load
  const shouldUseInitial = !hasAnimatedIn && !isAnimating;

  const handleClick = () => {
    startAnimation(cardIdStr);
    router.push(`/credit-cards/${card.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <motion.div
      layout="position"
      initial={shouldUseInitial ? { opacity: 0, scale: 0.95 } : false}
      animate={{
        opacity: shouldFadeOut ? SHARED_LAYOUT_ANIMATIONS.FADE_OPACITY : 1,
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={
        hoverEnabled ? { scale: CARD_GRID_ANIMATIONS.HOVER_SCALE } : undefined
      }
      whileTap={
        hoverEnabled ? { scale: CARD_GRID_ANIMATIONS.TAP_SCALE } : undefined
      }
      transition={{
        opacity: { duration: SHARED_LAYOUT_ANIMATIONS.FADE_DURATION },
        layout: {
          type: "spring",
          stiffness: SHARED_LAYOUT_ANIMATIONS.SPRING_STIFFNESS,
          damping: SHARED_LAYOUT_ANIMATIONS.SPRING_DAMPING,
          duration: SHARED_LAYOUT_ANIMATIONS.DURATION,
        },
      }}
      className={cx(
        "group w-full cursor-pointer",
        isAnimating && !isCurrentCard && "pointer-events-none",
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => router.prefetch(`/credit-cards/${card.id}`)}
      role="button"
      tabIndex={0}
      aria-label={`View ${card.cardName} details`}
    >
      {/* Card Visual - Shared element wrapper (fixed aspect, no size distortion) */}
      <motion.div
        ref={spotlightRef}
        layoutId={sharedLayoutId}
        layout="position"
        transition={{
          type: "spring",
          stiffness: SHARED_LAYOUT_ANIMATIONS.SPRING_STIFFNESS,
          damping: SHARED_LAYOUT_ANIMATIONS.SPRING_DAMPING,
          duration: SHARED_LAYOUT_ANIMATIONS.DURATION,
        }}
        onMouseMove={handleSpotlight}
        className="apothecary-spotlight relative w-full rounded-2xl p-1.5 transition-shadow duration-300 group-hover:shadow-[0_24px_60px_-30px_rgba(127,184,154,0.45)]"
      >
        <UntitledCreditCard card={card} />

        {/* Remove from wallet button - only shown when viewing a wallet */}
        {walletId && (
          <button
            type="button"
            onClick={handleRemoveFromWallet}
            disabled={isRemoving}
            className={cx(
              "absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center",
              "rounded-full bg-error-primary text-white shadow-md",
              "opacity-0 transition-opacity group-hover:opacity-100",
              "hover:bg-error-600 focus:outline-none focus:ring-2 focus:ring-error-primary focus:ring-offset-2",
              isRemoving && "cursor-not-allowed opacity-50"
            )}
            aria-label="Remove from wallet"
          >
            <XClose className="h-3.5 w-3.5" />
          </button>
        )}
      </motion.div>

      {/* Extended Details - Only shown when expanded, constrained to card width */}
      <AnimatePresence initial={false}>
        {isExtended && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-3 px-1.5"
          >
            {/* Card Name & Payment Status */}
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-[family-name:var(--font-geist)] text-sm font-medium text-primary">
                  {card.cardName}
                </h3>
                <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.18em] uppercase text-text-brand-tertiary">
                  {card.company}
                </p>
              </div>
              <PaymentDueBadge
                nextPaymentDueDate={card.nextPaymentDueDate}
                isOverdue={card.isOverdue}
                minimumPaymentAmount={card.minimumPaymentAmount}
                size="sm"
                showIcon={false}
              />
            </div>

            {/* Utilization Bar */}
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.18em] uppercase text-text-brand-tertiary">
                  Util
                </span>
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-medium tabular-nums text-primary">
                  {card.utilization !== null ? `${card.utilization}%` : "--"}
                </span>
              </div>
              <UtilizationBar utilization={card.utilization} />
            </div>

            {/* Statement Balance, Min Payment, Due Date, APR */}
            <div className="grid grid-cols-4 gap-2 border-t border-[var(--apothecary-hairline)] pt-3 text-xs">
              {[
                { label: "Statement", value: formatDisplayCurrency(card.lastStatementBalance) },
                { label: "Min", value: formatDisplayCurrency(card.minimumPaymentAmount) },
                {
                  label: "Due",
                  value: card.nextPaymentDueDate ? formatDueDate(card.nextPaymentDueDate) : "--",
                },
                { label: "APR", value: formatApr(card.apr) },
              ].map((cell) => (
                <div key={cell.label}>
                  <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] tracking-[0.18em] uppercase text-text-brand-tertiary">
                    {cell.label}
                  </p>
                  <p className="mt-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[12px] font-medium tabular-nums text-primary">
                    {cell.value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
