"use client";

import { motion } from "motion/react";
import { FlippableCreditCard } from "./FlippableCreditCard";
import { SHARED_LAYOUT_ANIMATIONS } from "@/lib/constants/animations";
import type { ExtendedCreditCardData } from "@/types/credit-cards";

interface UntitledCardVisualProps {
  card: ExtendedCreditCardData;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** When true, enables flip interaction on the card */
  interactive?: boolean;
}

/**
 * Detail view wrapper for UntitledUI credit card visual
 *
 * Provides shared element transition from grid view using matching layoutId.
 * Uses FlippableCreditCard for 3D flip animation in detail view.
 */
export function UntitledCardVisual({
  card,
  size = "lg",
  className,
  interactive = true,
}: UntitledCardVisualProps) {
  const sizeWidths = {
    sm: 240,
    md: 320,
    lg: 400,
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
      className={className}
    >
      <FlippableCreditCard
        card={card}
        width={sizeWidths[size]}
        interactive={interactive}
      />
    </motion.div>
  );
}
