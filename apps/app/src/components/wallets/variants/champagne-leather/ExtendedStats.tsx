// apps/app/src/components/wallets/variants/champagne-leather/ExtendedStats.tsx
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
 * Champagne Leather stats panel: champagne-grain material matching the
 * wallet (vs Variant A's cream parchment). Dark-ink serif type. Same
 * composition as the wallet chassis so the receipt reads as part of the
 * holder, not a separate paper artifact.
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
            className="relative grid grid-cols-2 gap-3 rounded p-4 text-sm"
            style={{
              // Champagne-grain material — same backgroundImage stack as the
              // chassis above so the panel reads as part of the same wallet.
              backgroundImage:
                "url('/wallet-textures/leather.png'), radial-gradient(ellipse at 30% 25%, rgba(255,245,210,0.18), transparent 60%), linear-gradient(135deg, #d4c59c 0%, #b8a878 60%, #8c7e54 100%)",
              backgroundBlendMode: "overlay, normal, normal",
              boxShadow:
                "0 8px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,245,215,0.5), inset 0 -1px 0 rgba(80,65,30,0.18)",
              color: "#2a2218",
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
                  ? "text-emerald-800"
                  : (walletStats.averageUtilization ?? 0) < 70
                    ? "text-amber-800"
                    : "text-red-900",
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
    <div>
      <p
        className="text-[10px] uppercase tracking-[0.18em]"
        style={{
          color: "rgba(50,40,20,0.55)",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {label}
      </p>
      <p
        className={cx(
          "mt-0.5 font-medium",
          // Default ink only when the utilization tint isn't applied.
          // `valueClassName` (text-emerald-800 / text-amber-800 / text-red-900)
          // wins when present, so the utilization stat actually colorizes.
          // Previously an inline `style={{ color: "#2a2218" }}` clobbered
          // the conditional class — fixed per CodeRabbit on PR #260.
          !valueClassName && "text-[#2a2218]",
          valueClassName,
        )}
        style={{
          fontFamily: "var(--font-fraunces), Georgia, serif",
          fontSize: 16,
        }}
      >
        {value}
      </p>
    </div>
  );
}
