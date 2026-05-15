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
 * Champagne Leather mini-card preview — v4 (3-stacked-in-middle).
 *
 * Borrows Variant D's vertical-stack pattern but recolors the cards from
 * translucent glass to champagne-tinted "cards in slots" — the leather-
 * wallet equivalent of slipping cards into a multi-slot cardholder.
 *
 * Layout:
 *   - Up to 3 cards stacked vertically, centered horizontally and
 *     dead-centered vertically inside the h-44 (176px) preview area.
 *   - Each card 30px tall × 184px wide, 6px gap between → 102px stack
 *     height → top:37 places stack center at y=88 (container center y=88).
 *   - Champagne-tonal background with subtle inset shadow ("sits in slot").
 *   - Brand-color chip on the left (small accent — keeps the palette quiet).
 *   - Card display name in Fraunces italic, last-4 right-aligned.
 *
 * Hover: each card spreads horizontally by ±index*3px (gentle fan).
 *
 * Returns null when empty; the parent WalletCard renders the
 * empty-wallet affordance directly on the chassis.
 */
export function MiniCardPreview({ cards, isHovered }: PreviewProps) {
  if (cards.length === 0) {
    return null;
  }

  // Up to 3 cards (matches Variant D's stacked pattern).
  const previewCards = cards.slice(0, 3);

  return (
    <div className="pointer-events-none relative h-44 w-full">
      <div
        className="absolute left-1/2 flex flex-col"
        style={{
          top: 37,
          width: 184,
          gap: 6,
          transform: "translateX(-50%)",
        }}
      >
        {previewCards.map((card, index) => {
          const colors =
            brandColors[card.brand ?? "other"] ?? brandColors.other!;
          // Center the fan: with 3 cards (indices 0,1,2), offsets are -1,0,+1
          const fanOffset = index - (previewCards.length - 1) / 2;

          return (
            <motion.div
              key={card._id}
              className="relative rounded-md"
              style={{
                height: 30,
                // Champagne-tonal gradient — lighter than the wallet for
                // contrast, with subtle inset shadow for "sits in slot" feel.
                background:
                  "linear-gradient(180deg, rgba(244,230,190,0.96) 0%, rgba(208,190,148,0.92) 100%)",
                border: "1px solid rgba(80,65,30,0.18)",
                boxShadow:
                  "0 2px 6px rgba(40,30,15,0.4), inset 0 1px 0 rgba(255,250,235,0.55), inset 0 -1px 0 rgba(80,65,30,0.2)",
              }}
              animate={{
                x: isHovered ? fanOffset * 3 : 0,
                y: isHovered ? -index * 1 : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 24,
                delay: index * 0.02,
              }}
            >
              {/* brand chip — visible color accent on the champagne card */}
              <div
                className={cx(
                  "absolute left-3 top-2 rounded-sm bg-gradient-to-br",
                  colors.bg,
                )}
                style={{
                  width: 22,
                  height: 14,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
                }}
                aria-hidden
              />
              {/* card display name — Fraunces italic dark ink, matches the
                  wallet name's typographic family */}
              <span
                className="absolute left-9 top-1/2 -translate-y-1/2 truncate text-[10px] font-medium italic"
                style={{
                  color: "#2a2218",
                  maxWidth: 100,
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  letterSpacing: "0.005em",
                }}
              >
                {card.displayName}
              </span>
              {/* last 4 — right-aligned, dimmer ink */}
              {card.lastFour && (
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] tracking-wider"
                  style={{
                    color: "rgba(50,40,20,0.62)",
                    fontFamily: "ui-sans-serif, system-ui, sans-serif",
                  }}
                >
                  ··· {card.lastFour}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
