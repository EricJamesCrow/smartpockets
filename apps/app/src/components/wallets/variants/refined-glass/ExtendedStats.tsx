// apps/app/src/components/wallets/variants/refined-glass/ExtendedStats.tsx
"use client";

import { motion, AnimatePresence } from "motion/react";
import { cx } from "@repo/ui/utils";
import { formatMoneyFromDollars } from "@/utils/money";
import { GRAIN_SVG_URL } from "./grain.svg";

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
 * Refined + Glass stats panel. Slides open below the wallet card when
 * `isExtended` is on. Picks up the same champagne-tinted glass veil as
 * the card material so the panel feels welded to the holder.
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
            className="relative grid grid-cols-2 gap-3 overflow-hidden rounded-2xl p-4 text-sm"
            style={{
              background:
                "linear-gradient(135deg, rgba(212,197,156,0.06), transparent), linear-gradient(160deg, #1f1c17 0%, #15130f 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(212,197,156,0.18), 0 18px 36px rgba(0,0,0,0.4)",
            }}
          >
            {/* grain overlay */}
            <span
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `url("${GRAIN_SVG_URL}")`,
                opacity: 0.06,
                mixBlendMode: "overlay",
              }}
            />
            {/* hairline top edge accent */}
            <span
              className="pointer-events-none absolute left-0 right-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(212,197,156,0.4), transparent)",
              }}
            />
            <Stat label="Total Balance" value={formatMoneyFromDollars(walletStats.totalBalance)} />
            <Stat
              label="Credit Limit"
              value={formatMoneyFromDollars(walletStats.totalCreditLimit, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            />
            <Stat label="Available" value={formatMoneyFromDollars(walletStats.totalAvailableCredit)} />
            <Stat
              label="Utilization"
              value={`${(walletStats.averageUtilization ?? 0).toFixed(0)}%`}
              valueClassName={cx(
                (walletStats.averageUtilization ?? 0) < 30
                  ? "text-success-primary"
                  : (walletStats.averageUtilization ?? 0) < 70
                    ? "text-warning-primary"
                    : "text-error-primary"
              )}
            />
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
    <div className="relative z-10">
      <p
        className="text-[10px] uppercase tracking-[0.15em]"
        style={{ color: "rgba(212,197,156,0.55)" }}
      >
        {label}
      </p>
      <p
        className={cx("mt-0.5 font-medium", valueClassName)}
        style={{ color: "#f0e8d0", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
      >
        {value}
      </p>
    </div>
  );
}
