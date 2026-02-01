"use client";

import { use } from "react";
import { motion } from "motion/react";
import type { Id } from "@convex/_generated/dataModel";
import { CreditCardDetailContent } from "@/components/credit-cards/CreditCardDetailContent";

interface CardDetailPageProps {
  params: Promise<{ cardId: string }>;
}

/**
 * Credit Card Detail Page
 *
 * Displays detailed information for a single credit card with:
 * - Shared layout animation from grid (card visual transitions seamlessly)
 * - Key metrics (balance, available credit, limit, APR)
 * - Utilization progress
 * - Payment information
 */
export default function CardDetailPage({ params }: CardDetailPageProps) {
  const { cardId } = use(params);

  return (
    <motion.div
      key={`credit-card-detail-${cardId}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // No exit opacity - let shared layout animation handle the card transition
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <CreditCardDetailContent cardId={cardId as Id<"creditCards">} />
    </motion.div>
  );
}
