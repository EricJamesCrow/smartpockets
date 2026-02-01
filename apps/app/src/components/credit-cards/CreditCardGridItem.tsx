"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { cx } from "@repo/ui/utils";
import { ConfiguredCreditCard } from "./primitives";
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

interface CreditCardGridItemProps {
  card: ExtendedCreditCardData;
  isExtended: boolean;
  className?: string;
}

/**
 * Grid item component for displaying a credit card
 *
 * - Minimal mode: Just the card visual (like SmartPockets)
 * - Extended mode: Card + info below (constrained to card width)
 */
export function CreditCardGridItem({
  card,
  isExtended,
  className,
}: CreditCardGridItemProps) {
  const router = useRouter();
  const { isAnimating, animatingCardId, startAnimation } =
    useSharedLayoutAnimation();

  // Track if this is the initial mount (for stagger animation on first load)
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  useEffect(() => {
    setHasAnimatedIn(true);
  }, []);

  const cardIdStr = card.id as string;
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

  // Map ExtendedCreditCardData to CreditCardData for primitives
  const primitiveCardData = {
    id: card.id as string,
    cardName: card.cardName,
    company: card.company,
    brand: mapBrandToPrimitiveNetwork(card.brand),
    lastFour: card.lastFour,
    cardholderName: card.cardholderName,
  };

  return (
    <motion.div
      layout
      layoutId={`card-${cardIdStr}`}
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
        "group inline-block w-[280px] cursor-pointer",
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
      {/* Card Visual - Using SmartPockets primitives */}
      <ConfiguredCreditCard
        card={primitiveCardData}
        flipEnabled={false}
      />

      {/* Extended Details - Only shown when expanded, constrained to card width */}
      {isExtended && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-3"
        >
          {/* Card Name & Company */}
          <div className="mb-2">
            <h3 className="truncate text-sm font-semibold text-primary">
              {card.cardName}
            </h3>
            <p className="text-xs text-tertiary">{card.company}</p>
          </div>

          {/* Utilization Bar */}
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-tertiary">Utilization</span>
              <span className="text-xs font-medium tabular-nums text-primary">
                {card.utilization !== null ? `${card.utilization}%` : "--"}
              </span>
            </div>
            <UtilizationBar utilization={card.utilization} />
          </div>

          {/* APR, Min Payment, Due Date */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-tertiary">APR</p>
              <p className="font-medium text-primary">{formatApr(card.apr)}</p>
            </div>
            <div>
              <p className="text-tertiary">Min Payment</p>
              <p className="font-medium text-primary">
                {formatDisplayCurrency(card.minimumPaymentAmount)}
              </p>
            </div>
            <div>
              <p className="text-tertiary">Due Date</p>
              <p className="font-medium text-primary">
                {card.nextPaymentDueDate
                  ? formatDueDate(card.nextPaymentDueDate)
                  : "--"}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Map CardBrand to primitive PaymentNetwork type
 */
function mapBrandToPrimitiveNetwork(
  brand: ExtendedCreditCardData["brand"]
): "Visa" | "Mastercard" | "Amex" | "Discover" {
  switch (brand) {
    case "visa":
      return "Visa";
    case "mastercard":
      return "Mastercard";
    case "amex":
      return "Amex";
    case "discover":
      return "Discover";
    default:
      return "Visa";
  }
}
