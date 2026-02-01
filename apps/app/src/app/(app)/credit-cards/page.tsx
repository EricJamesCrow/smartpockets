"use client";

import { motion } from "motion/react";
import { CreditCardsContent } from "@/components/credit-cards/CreditCardsContent";

/**
 * Credit Cards List Page
 *
 * Displays a grid of all credit cards with:
 * - Shared layout animations for seamless transitions to detail pages
 * - Card visuals with company branding
 * - Quick stats (utilization, payment due)
 * - Click-to-navigate to detail view
 */
export default function CreditCardsPage() {
  return (
    <motion.div
      key="credit-cards-list"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // No exit opacity - let shared layout animation handle the card transition
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <CreditCardsContent />
    </motion.div>
  );
}
