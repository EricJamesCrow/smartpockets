// apps/app/src/components/wallets/variants/champagne-leather/MiniCardPreview.tsx
"use client";

import { motion } from "motion/react";
import { brandColors } from "../../shared";
import { cx } from "@repo/ui/utils";

interface PreviewProps {
  /** Up to 2 cards from useWalletCard.previewCards, flattened to `.card` */
  cards: Array<{
    brand?: string;
    lastFour?: string;
    displayName: string;
    _id: string;
  }>;
  isHovered: boolean;
}

/**
 * Champagne Leather mini-card preview: 2 cards visibly tucked into the
 * top of the wallet (one fewer than Variant A — more restrained). Same
 * fan-up-on-hover motion as A, with slightly reduced spread to match the
 * restrained champagne palette.
 *
 * Returns null when empty; the parent `WalletCard` renders the
 * empty-wallet affordance directly on the chassis.
 */
export function MiniCardPreview({ cards, isHovered }: PreviewProps) {
  if (cards.length === 0) {
    return null;
  }

  // Cap at 2 — one fewer than Variant A's 3, per spec §6 Variant C.
  const previewCards = cards.slice(0, 2);

  return (
    <div className="pointer-events-none absolute -top-2 left-8 right-8 z-20">
      {previewCards.map((card, index) => {
        const colors =
          brandColors[card.brand ?? "other"] ?? brandColors.other!;
        const baseY = -index * 1;
        const hoverY = -(index + 1) * 12;

        return (
          <motion.div
            key={card._id}
            className={cx(
              "absolute left-0 right-0 rounded-md bg-gradient-to-br",
              colors.bg,
            )}
            style={{
              top: index * 5,
              height: 26,
              zIndex: previewCards.length - index,
              boxShadow:
                "0 3px 6px rgba(40,30,15,0.4), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
            initial={false}
            animate={{
              y: isHovered ? hoverY : baseY,
              rotate: isHovered ? (index - 0.5) * 3 : 0,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            <motion.div
              className="flex h-full items-center justify-between px-3"
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <span
                className={cx("h-1.5 w-6 rounded", colors.accent)}
                style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)" }}
              />
              {card.lastFour && (
                <span
                  className="text-[9px] tracking-wider text-white/75"
                  style={{
                    fontFamily: "ui-sans-serif, system-ui, sans-serif",
                  }}
                >
                  •••• {card.lastFour}
                </span>
              )}
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
