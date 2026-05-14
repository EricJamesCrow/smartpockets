// apps/app/src/components/wallets/variants/champagne-leather/MiniCardPreview.tsx
"use client";

import { motion } from "motion/react";
import { brandColors } from "../../shared";
import { cx } from "@repo/ui/utils";

interface PreviewProps {
  /** Cards from useWalletCard.previewCards (already flattened to .card). */
  cards: Array<{
    brand?: string;
    lastFour?: string;
    displayName: string;
    _id: string;
  }>;
  isHovered: boolean;
}

/**
 * Champagne Leather mini-card preview — centered hero slot (v2).
 *
 * Showcases a single hero credit card centered in the wallet's upper
 * half (200×120, credit-card aspect 1.667 matching UntitledUI's
 * 316×190 stock). Two peek-edge lines sit above the hero card to
 * suggest more cards stacked behind.
 *
 * Hover behavior:
 *   - Hero card lifts ~4px and gains a touch of scale
 *   - Peek lines spread upward to suggest the stack opening
 *   - Aceternity-style cursor spotlight (in WalletCard) catches the
 *     polished leather around the card
 *
 * Replaces the earlier "2 cards peeking from the top" pattern. The
 * centered showcase pairs better with the leather wallet's
 * "presenting one card to you" mental model.
 *
 * Returns null when empty; the parent WalletCard renders the
 * empty-wallet affordance directly on the chassis.
 */
export function MiniCardPreview({ cards, isHovered }: PreviewProps) {
  if (cards.length === 0) {
    return null;
  }

  const heroCard = cards[0]!;
  const colors = brandColors[heroCard.brand ?? "other"] ?? brandColors.other!;

  return (
    <div className="pointer-events-none relative h-44 w-full">
      {/* peek line 2 (further back, narrower) */}
      <motion.div
        className="absolute left-1/2 h-1 rounded-sm"
        style={{
          width: 160,
          top: 14,
          transform: "translateX(-50%)",
          background:
            "linear-gradient(180deg, rgba(80,65,30,0.32), transparent)",
        }}
        animate={{ y: isHovered ? -3 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
      {/* peek line 1 (front of stack — just behind the hero card) */}
      <motion.div
        className="absolute left-1/2 h-1 rounded-sm"
        style={{
          width: 184,
          top: 20,
          transform: "translateX(-50%)",
          background:
            "linear-gradient(180deg, rgba(80,65,30,0.48), transparent)",
        }}
        animate={{ y: isHovered ? -2 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
      {/* hero card slot — credit-card aspect ratio 200/120 ≈ 1.667
          Centered in the h-44 (176px) container: top:28 + height:120 places
          the card center at y=88, container center at y=88. Pixel-centered. */}
      <motion.div
        className={cx(
          "absolute left-1/2 rounded-2xl bg-gradient-to-br",
          colors.bg,
        )}
        style={{
          top: 28,
          width: 200,
          height: 120,
          transform: "translateX(-50%)",
          boxShadow:
            "0 10px 24px rgba(40,30,15,0.55), 0 2px 6px rgba(40,30,15,0.4), inset 0 1px 0 rgba(255,245,215,0.5), inset 0 -1px 0 rgba(0,0,0,0.18)",
        }}
        animate={{
          y: isHovered ? -4 : 0,
          scale: isHovered ? 1.01 : 1,
        }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
      >
        {/* chip — sized like UntitledUI's credit-card chip */}
        <div
          className={cx("absolute right-4 top-3 rounded-sm", colors.accent)}
          style={{
            width: 30,
            height: 22,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
          }}
        />
        {/* last 4 */}
        {heroCard.lastFour && (
          <span
            className="absolute bottom-3 right-4 text-[10px] tracking-wider text-white/75"
            style={{
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
            }}
          >
            •••• {heroCard.lastFour}
          </span>
        )}
      </motion.div>
    </div>
  );
}
