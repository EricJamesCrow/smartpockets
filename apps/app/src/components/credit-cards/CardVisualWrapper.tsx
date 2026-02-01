"use client";

import { motion } from "motion/react";
import { ConfiguredCreditCard } from "./primitives";
import { SHARED_LAYOUT_ANIMATIONS } from "@/lib/constants/animations";
import type { ExtendedCreditCardData } from "@/types/credit-cards";

interface CardVisualWrapperProps {
  card: ExtendedCreditCardData;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Wrapper component for credit card visual that enables shared element transitions
 *
 * This component uses the same layoutId pattern as CreditCardGridItem to create
 * a seamless animation when navigating between the grid and detail pages.
 *
 * The layout="position" prop prevents text content from distorting during
 * the transition animation.
 */
export function CardVisualWrapper({
  card,
  size = "lg",
  className,
}: CardVisualWrapperProps) {
  // Map ExtendedCreditCardData to CreditCardData for primitives
  const primitiveCardData = {
    id: card.id as string,
    cardName: card.cardName,
    company: card.company,
    brand: mapBrandToPrimitiveNetwork(card.brand),
    lastFour: card.lastFour,
    cardholderName: card.cardholderName,
  };

  const sizeClasses = {
    sm: "max-w-[240px]",
    md: "max-w-[320px]",
    lg: "max-w-[400px]",
  };

  const cardIdStr = card.id as string;

  return (
    <motion.div
      layoutId={`card-${cardIdStr}`}
      layout="position"
      transition={{
        type: "spring",
        stiffness: SHARED_LAYOUT_ANIMATIONS.SPRING_STIFFNESS,
        damping: SHARED_LAYOUT_ANIMATIONS.SPRING_DAMPING,
        duration: SHARED_LAYOUT_ANIMATIONS.DURATION,
      }}
      className={`w-full ${sizeClasses[size]} ${className || ""}`}
    >
      <ConfiguredCreditCard
        card={primitiveCardData}
        flipEnabled={true}
      />
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
