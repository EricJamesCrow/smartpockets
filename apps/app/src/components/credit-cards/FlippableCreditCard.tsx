"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cx } from "@repo/ui/utils";
import { UntitledCreditCard } from "./UntitledCreditCard";
import { CreditCardBack } from "./CreditCardBack";
import type { ExtendedCreditCardData } from "@/types/credit-cards";

interface FlippableCreditCardProps {
  card: ExtendedCreditCardData;
  /** Fixed width in pixels. If not provided, uses responsive sizing */
  width?: number;
  className?: string;
  /** When false, disables flip interaction (useful for grid items that navigate on click) */
  interactive?: boolean;
}

/**
 * Credit card component with 3D flip animation on hover
 *
 * Wraps the UntitledUI CreditCard as the front face and adds a custom back
 * with magnetic stripe, signature strip, CVV area, and hologram.
 *
 * Uses Framer Motion for smooth 3D flip animation with spring physics.
 */
export function FlippableCreditCard({
  card,
  width,
  className,
  interactive = true,
}: FlippableCreditCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Standard credit card aspect ratio (ISO/IEC 7810 ID-1)
  const aspectRatio = 85.6 / 53.98; // ~1.586

  return (
    <div
      className={cx("relative w-full", className)}
      style={{
        perspective: "1000px",
        aspectRatio,
        ...(width ? { width: `${width}px` } : {}),
      }}
      onMouseEnter={() => interactive && setIsFlipped(true)}
      onMouseLeave={() => interactive && setIsFlipped(false)}
      aria-label={`${card.cardName} credit card`}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
          duration: 0.6,
          type: "spring",
          stiffness: 100,
          damping: 15,
        }}
      >
        {/* Front of card */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden" }}
        >
          <UntitledCreditCard card={card} width={width} />
        </div>

        {/* Back of card */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <CreditCardBack card={card} />
        </div>
      </motion.div>
    </div>
  );
}
