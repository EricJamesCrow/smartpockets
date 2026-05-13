// apps/app/src/components/wallets/variants/leather/MiniCardPreview.tsx
"use client";

import { motion, AnimatePresence } from "motion/react";
import { brandColors } from "../../shared";
import { cx } from "@repo/ui/utils";

interface PreviewProps {
  /** Up to 3 cards from useWalletCard.previewCards, flattened to `.card` */
  cards: Array<{
    brand?: string;
    lastFour?: string;
    displayName: string;
    _id: string;
  }>;
  isHovered: boolean;
}

/**
 * Literal Leather preview: up to 3 brand-colored cards "tucked" into the
 * top inner seam of the wallet. At rest they peek as colored slivers
 * (the wallet pocket clips the bottom half); on hover they fan upward
 * with a small per-card delay so the user sees them shuffle out of the
 * pocket.
 *
 * The hovered fan-out reveals the brand chip and last-four — same
 * read-on-hover treatment as the legacy baseline card, but the rest-state
 * silhouette is intentionally short (cards 80% inside the wallet) so the
 * leather chassis dominates when the user isn't interacting.
 */

const REST_OFFSET = 24; // px peeking above the wallet seam at rest
const HOVER_LIFT = 22; // px lifted further on hover
const FAN_SPREAD_DEG = 6; // ± rotation around centre card on hover
const HOVER_SCALE = 1.02;

export function MiniCardPreview({ cards, isHovered }: PreviewProps) {
  if (cards.length === 0) {
    return (
      <div className="relative h-24 w-full">
        {/* Empty wallet — debossed Fraunces italic on bare leather */}
        <div className="absolute inset-x-6 top-6 h-14 rounded-xl border border-dashed"
          style={{
            borderColor: "rgba(225,185,140,0.32)",
            background: "rgba(0,0,0,0.18)",
            boxShadow:
              "inset 0 2px 6px rgba(0,0,0,0.45), inset 0 -1px 0 rgba(255,210,160,0.05)",
          }}
        >
          <span
            className="absolute inset-0 flex items-center justify-center text-sm"
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontStyle: "italic",
              color: "rgba(225,185,140,0.55)",
              textShadow:
                "0 1px 0 rgba(0,0,0,0.7), 0 -1px 0 rgba(255,210,160,0.08)",
            }}
          >
            Empty wallet
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-24 w-full overflow-hidden">
      {cards.map((card, index) => {
        const colors =
          brandColors[card.brand ?? "other"] ?? brandColors.other!;
        // index 0 = top card (visually frontmost); 1, 2 sit further back/lower
        // Stagger the rest position so each peek is a distinct sliver
        const restY = REST_OFFSET + index * 4;
        const hoverY = -HOVER_LIFT - index * 18;
        // Centre card sits straight at hover; outer cards fan outward
        const centerIndex = Math.min(1, cards.length - 1);
        const hoverRotate = (index - centerIndex) * FAN_SPREAD_DEG;
        // Each card pops out with a small stagger so the eye reads the
        // fan as a deliberate gesture not a single jump
        const hoverDelay = index * 0.04;

        return (
          <motion.div
            key={card._id}
            className={cx(
              "absolute left-1/2 h-20 w-44 rounded-xl bg-gradient-to-br",
              colors.bg,
            )}
            style={{
              zIndex: cards.length - index,
              originY: 1,
              boxShadow:
                "0 6px 18px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.25)",
              x: "-50%",
            }}
            animate={{
              y: isHovered ? hoverY : restY,
              rotate: isHovered ? hoverRotate : 0,
              scale: isHovered ? HOVER_SCALE : 1 - index * 0.02,
            }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 24,
              delay: isHovered ? hoverDelay : 0,
            }}
          >
            {/* chip — always shown as a small slot so the colored sliver
                reads as a card-edge at rest, not a coloured bar */}
            <div
              className={cx(
                "absolute right-3 top-2 h-3.5 w-5 rounded-sm",
                colors.accent,
              )}
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }}
            />
            {/* Display name + last-four — only readable when fanned out */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  className="absolute bottom-2 left-3 right-3 flex items-end justify-between"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, delay: hoverDelay + 0.05 }}
                >
                  <span className="max-w-[60%] truncate text-[10px] font-medium text-white/90">
                    {card.displayName}
                  </span>
                  {card.lastFour && (
                    <span className="text-[10px] tracking-wider text-white/70">
                      •••• {card.lastFour}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
