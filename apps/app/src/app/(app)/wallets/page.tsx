"use client";

import { motion } from "motion/react";
import { WalletsContent } from "@/components/wallets/WalletsContent";

/**
 * Wallets List Page
 *
 * Displays a grid of all wallets with:
 * - Shared layout animations for seamless transitions to detail pages
 * - Wallet visuals with branding
 * - Quick stats (balance, recent activity)
 * - Click-to-navigate to detail view
 */
export default function WalletsPage() {
  return (
    <motion.div
      key="wallets-list"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // No exit opacity - let shared layout animation handle the wallet transition
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <WalletsContent />
    </motion.div>
  );
}
