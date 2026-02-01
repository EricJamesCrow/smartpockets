/**
 * Credit Cards Section Layout
 *
 * Wraps credit cards grid and detail pages with:
 * 1. SharedLayoutAnimationProvider - Manages animation state across routes
 * 2. LayoutGroup - Enables Framer Motion shared element animations
 * 3. AnimatePresence - Handles enter/exit animations during route changes
 *
 * This enables smooth shared layout transitions:
 * - Grid → Detail: Card grows from grid position, other cards fade out
 * - Detail → Grid: Card shrinks back to grid position, other cards fade in
 *
 * Note: mode="popLayout" is used instead of "wait" because:
 * - "wait" completes exit animation before starting enter animation
 * - This breaks shared element transitions (card fades out completely before new page)
 * - "popLayout" removes exiting element from flow but allows layout animations to continue
 */

"use client";

import { LayoutGroup, AnimatePresence } from "motion/react";
import { SharedLayoutAnimationProvider } from "@/lib/context/shared-layout-animation-context";

export default function CreditCardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SharedLayoutAnimationProvider>
      <LayoutGroup>
        <AnimatePresence mode="popLayout">{children}</AnimatePresence>
      </LayoutGroup>
    </SharedLayoutAnimationProvider>
  );
}
