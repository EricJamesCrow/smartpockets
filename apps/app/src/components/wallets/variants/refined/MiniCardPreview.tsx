// apps/app/src/components/wallets/variants/refined/MiniCardPreview.tsx
"use client";

import { motion } from "motion/react";
import { brandColors, type MiniCardPreviewProps } from "../../shared";
import { cx } from "@repo/ui/utils";

interface PreviewProps {
  /** First 3 cards from useWalletCard.previewCards; only first one is drawn full-size */
  cards: Array<{ brand?: string; lastFour?: string; displayName: string; _id: string }>;
  isHovered: boolean;
}

/**
 * Refined Materiality preview: hero champagne slot (200x120, aspect 1.667)
 * with two peek-edge lines suggesting cards stacked behind. On hover the
 * slot lifts gently and the peek lines spread.
 */
export function MiniCardPreview({ cards, isHovered }: PreviewProps) {
  if (cards.length === 0) {
    return (
      <div className="relative h-44 w-full">
        <div
          className="absolute left-1/2 top-6 h-30 w-50 -translate-x-1/2 rounded-2xl border border-dashed"
          style={{
            borderColor: "rgba(212, 197, 156, 0.25)",
            background: "rgba(212, 197, 156, 0.03)",
          }}
        >
          <span
            className="absolute inset-0 flex items-center justify-center text-xs"
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontStyle: "italic",
              color: "rgba(212, 197, 156, 0.5)",
            }}
          >
            Add a card
          </span>
        </div>
      </div>
    );
  }

  const heroCard = cards[0]!;
  const colors = brandColors[heroCard.brand ?? "other"] ?? brandColors.other!;

  return (
    <div className="relative h-44 w-full">
      {/* peek line 2 (further back, narrower) */}
      <motion.div
        className="absolute left-1/2 h-1 rounded-sm"
        style={{
          width: 160,
          top: 12,
          background:
            "linear-gradient(180deg, rgba(212,197,156,0.35), transparent)",
        }}
        animate={{ y: isHovered ? -3 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
      {/* peek line 1 */}
      <motion.div
        className="absolute left-1/2 h-1 rounded-sm"
        style={{
          width: 180,
          top: 18,
          background:
            "linear-gradient(180deg, rgba(212,197,156,0.6), transparent)",
        }}
        animate={{ y: isHovered ? -2 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
      {/* hero card slot — credit-card aspect ratio 200/120 ≈ 1.667 */}
      <motion.div
        className={cx(
          "absolute left-1/2 top-7 h-30 w-50 -translate-x-1/2 rounded-2xl bg-gradient-to-br",
          colors.bg
        )}
        style={{
          boxShadow:
            "0 8px 22px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,245,215,0.5), inset 0 -1px 0 rgba(0,0,0,0.12)",
        }}
        animate={{
          y: isHovered ? -4 : 0,
          scale: isHovered ? 1.01 : 1,
        }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
      >
        {/* chip */}
        <div
          className={cx(
            "absolute right-4 top-3 h-5.5 w-7.5 rounded-sm",
            colors.accent
          )}
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }}
        />
        {/* last 4 */}
        {heroCard.lastFour && (
          <span
            className="absolute bottom-3 right-4 text-[10px] tracking-wider text-white/70"
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
