// apps/app/src/components/wallets/variants/glass/MiniCardPreview.tsx
"use client";

import { motion } from "motion/react";
import { brandColors } from "../../shared";
import { cx } from "@repo/ui/utils";

interface PreviewProps {
  cards: Array<{
    brand?: string;
    lastFour?: string;
    displayName: string;
    _id: string;
  }>;
  isHovered: boolean;
}

/**
 * Glass variant mini-card preview. Unlike Variant B's single hero slot,
 * this variant shows **3 translucent inner glass mini-panels** stacked
 * inside the wallet, each with the brand-color chip visible through the
 * glass. Empty state renders the dimmed glass content area with an
 * italic "Add a card" hint.
 */
export function MiniCardPreview({ cards, isHovered }: PreviewProps) {
  if (cards.length === 0) {
    return (
      <div className="relative flex h-32 w-full items-center justify-center">
        <span
          className="text-xs italic"
          style={{
            color: "rgba(255,255,255,0.45)",
            fontFamily: "var(--font-fraunces), Georgia, serif",
          }}
        >
          Add a card
        </span>
      </div>
    );
  }

  // Display up to 3 cards as inner glass panels
  const visibleCards = cards.slice(0, 3);

  return (
    <div className="relative px-6 pt-6">
      <div className="flex flex-col gap-1.5">
        {visibleCards.map((card, index) => {
          const colors = brandColors[card.brand ?? "other"] ?? brandColors.other!;
          return (
            <motion.div
              key={card._id}
              className="relative h-7 overflow-hidden rounded-md"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02))",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 0 16px rgba(255,255,255,0.04)",
              }}
              animate={{
                x: isHovered ? 0 : 0,
                y: isHovered ? -index * 1 : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 26,
                delay: index * 0.02,
              }}
            >
              {/* brand chip — visible through the glass */}
              <span
                className={cx(
                  "absolute left-2.5 top-1.5 h-3 w-4 rounded-sm bg-gradient-to-br",
                  colors.bg,
                )}
                style={{ opacity: 0.85 }}
              />
              {/* last 4 */}
              {card.lastFour && (
                <span
                  className="absolute bottom-1 right-2.5 text-[9px] tracking-wider text-white/55"
                  style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                >
                  •••• {card.lastFour}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
