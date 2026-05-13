// apps/app/src/components/wallets/variants/leather/ExtendedStats.tsx
"use client";

import { motion, AnimatePresence } from "motion/react";
import { cx } from "@repo/ui/utils";
import { formatMoneyFromDollars } from "@/utils/money";

interface ExtendedStatsProps {
  isExtended: boolean;
  walletStats:
    | {
        totalBalance: number;
        totalCreditLimit: number;
        totalAvailableCredit: number;
        averageUtilization?: number;
      }
    | null
    | undefined;
}

/**
 * Literal Leather stats panel — a "receipt" sliding out from underneath
 * the wallet. Cream-parchment gradient background, dark-ink Fraunces serif
 * numerals, and a perforated top edge composed via a repeating radial
 * gradient. The aesthetic intent is "tear-strip receipt the wallet just
 * spit out," NOT a flat data drawer.
 *
 * Layout matches the rest of the variants (2x2 stat grid) so the page-level
 * `isExtended` toggle behaves consistently across variants. Utilization
 * keeps its colour-coded tone (success/warning/error) — important info
 * shouldn't be lost to aesthetic uniformity.
 */
export function ExtendedStats({ isExtended, walletStats }: ExtendedStatsProps) {
  return (
    <AnimatePresence>
      {isExtended && walletStats && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 overflow-hidden"
        >
          <div
            className="relative rounded-b-2xl px-5 pb-4 pt-5"
            style={{
              // Perforated top edge — repeating radial cutouts in a horizontal
              // band, layered on top of the parchment gradient. The mask
              // technique gives a clean scalloped silhouette without an SVG.
              background:
                "linear-gradient(180deg, #f4ead4 0%, #ece2c2 100%)",
              // Parchment-paper grain: low-opacity radial spots
              backgroundImage:
                "radial-gradient(rgba(120,90,40,0.07) 1px, transparent 1.5px), linear-gradient(180deg, #f4ead4 0%, #ece2c2 100%)",
              backgroundSize: "8px 8px, auto",
              boxShadow:
                "inset 0 0 0 1px rgba(120,90,40,0.18), 0 14px 28px rgba(0,0,0,0.35)",
            }}
          >
            {/* Perforated top edge — a strip of scallops along the top */}
            <span
              className="pointer-events-none absolute left-0 right-0 top-0 h-2"
              style={{
                background:
                  "radial-gradient(circle at 6px 0, transparent 4px, #f4ead4 4.5px) repeat-x",
                backgroundSize: "12px 8px",
              }}
              aria-hidden
            />
            <div className="relative grid grid-cols-2 gap-x-4 gap-y-3 pt-1">
              <Stat
                label="Total Balance"
                value={formatMoneyFromDollars(walletStats.totalBalance)}
              />
              <Stat
                label="Credit Limit"
                value={formatMoneyFromDollars(walletStats.totalCreditLimit, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              />
              <Stat
                label="Available"
                value={formatMoneyFromDollars(
                  walletStats.totalAvailableCredit,
                )}
              />
              <Stat
                label="Utilization"
                value={`${(walletStats.averageUtilization ?? 0).toFixed(0)}%`}
                valueClassName={cx(
                  (walletStats.averageUtilization ?? 0) < 30
                    ? "text-success-primary"
                    : (walletStats.averageUtilization ?? 0) < 70
                      ? "text-warning-primary"
                      : "text-error-primary",
                )}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="relative">
      <p
        className="text-[9px] uppercase"
        style={{
          color: "rgba(80,55,20,0.7)",
          letterSpacing: "0.22em",
          fontFamily: "var(--font-fraunces), Georgia, serif",
          fontStyle: "italic",
        }}
      >
        {label}
      </p>
      <p
        className={cx("mt-0.5 text-base font-medium", valueClassName)}
        style={{
          color: "rgba(54,32,12,0.92)",
          fontFamily: "var(--font-fraunces), Georgia, serif",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </p>
    </div>
  );
}
