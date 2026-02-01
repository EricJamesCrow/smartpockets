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
 * Progress bar component for displaying credit utilization
 *
 * Color coding:
 * - Green: <30% utilization (good)
 * - Yellow: 30-69% utilization (moderate)
 * - Red: 70%+ utilization (high)
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
          <div className="flex items-center justify-between text-xs">
            <span className="text-tertiary">Utilization</span>
            <span className="text-tertiary">--</span>
          </div>
        )}
        <div className="h-2 w-full rounded-full bg-tertiary/20" />
      </div>
    );
  }

  const colors = getUtilizationColors(utilization);
  const clampedValue = Math.min(100, Math.max(0, utilization));

  return (
    <div className={cx("flex flex-col gap-1", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-tertiary">Utilization</span>
          {showPercentage && (
            <span className={cx("font-medium", colors.text)}>
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
          "rounded-full",
          colors.progressBg
        )}
        progressClassName={cx("rounded-full transition-all", colors.progress)}
      />
    </div>
  );
}

/**
 * Compact utilization indicator (just the bar, no labels)
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
      <div
        className={cx("h-1 w-full rounded-full bg-tertiary/20", className)}
      />
    );
  }

  const colors = getUtilizationColors(utilization);
  const clampedValue = Math.min(100, Math.max(0, utilization));

  return (
    <ProgressBarBase
      value={clampedValue}
      min={0}
      max={100}
      className={cx("h-1 rounded-full", colors.progressBg, className)}
      progressClassName={cx("rounded-full", colors.progress)}
    />
  );
}
