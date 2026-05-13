// apps/app/src/components/wallets/variants/glass/ExtendedStats.tsx
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
 * Glass variant ExtendedStats panel. Slides open below the main card.
 * Less-blurred than the main GlassCard so it reads as a secondary
 * surface (depth hierarchy: main card ~28px blur, this panel ~16px).
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
            className="relative grid grid-cols-2 gap-3 rounded-2xl p-4 text-sm"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              backdropFilter: "blur(16px) saturate(1.2)",
              WebkitBackdropFilter: "blur(16px) saturate(1.2)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.20), 0 18px 36px rgba(0,0,0,0.4)",
            }}
          >
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
              value={formatMoneyFromDollars(walletStats.totalAvailableCredit)}
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
        className="text-[10px] uppercase tracking-[0.08em]"
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        {label}
      </p>
      <p
        className={cx("mt-0.5 font-medium", valueClassName)}
        style={{
          color: "rgba(255,255,255,0.96)",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {value}
      </p>
    </div>
  );
}
