"use client";

import { cx } from "@repo/ui/utils";
import { ProgressBarBase } from "@repo/ui/untitledui/base/progress-indicators/progress-indicators";
import { getUtilizationColors, formatPercentage } from "@/types/credit-cards";

interface UtilizationProgressProps {
  utilization: number | null;
  showLabel?: boolean;
  showPercentage?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Square utilization progress bar.
 *
 * Color coding:
 * - Green: <30% utilization (good)
 * - Yellow: 30-69% utilization (moderate)
 * - Red: 70%+ utilization (high)
 *
 * Brand green is reserved for live ticking deltas. The static utilization
 * bar uses semantic success/warning/error tokens so the label color reads
 * as health, not as "live".
 */
export function UtilizationProgress({
  utilization,
  showLabel = true,
  showPercentage = true,
  size = "sm",
  className,
}: UtilizationProgressProps) {
  if (utilization === null) {
    return (
      <div className={cx("flex flex-col gap-1", className)}>
        {showLabel && (
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.12em]">
            <span className="text-zinc-500">UTILIZATION</span>
            <span className="text-zinc-600">--</span>
          </div>
        )}
        <div className="h-1.5 w-full bg-white/[0.04]" />
      </div>
    );
  }

  const colors = getUtilizationColors(utilization);
  const clampedValue = Math.min(100, Math.max(0, utilization));

  return (
    <div className={cx("flex flex-col gap-1", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-mono uppercase tracking-[0.12em] text-zinc-500">UTILIZATION</span>
          {showPercentage && (
            <span className={cx("font-mono tabular-nums font-medium", colors.text)}>
              {formatPercentage(utilization, 0)}
            </span>
          )}
        </div>
      )}
      <ProgressBarBase
        value={clampedValue}
        min={0}
        max={100}
        className={cx(
          size === "sm" ? "h-1.5" : "h-2",
          colors.progressBg,
        )}
        progressClassName={cx("transition-all", colors.progress)}
      />
    </div>
  );
}

/**
 * Compact utilization indicator (just the bar, no labels).
 */
export function UtilizationBar({
  utilization,
  className,
}: {
  utilization: number | null;
  className?: string;
}) {
  if (utilization === null) {
    return (
      <div className={cx("h-1 w-full bg-white/[0.04]", className)} />
    );
  }

  const colors = getUtilizationColors(utilization);
  const clampedValue = Math.min(100, Math.max(0, utilization));

  return (
    <ProgressBarBase
      value={clampedValue}
      min={0}
      max={100}
      className={cx("h-1", colors.progressBg, className)}
      progressClassName={cx(colors.progress)}
    />
  );
}
