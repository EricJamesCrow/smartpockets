// apps/app/src/components/wallets/variants/glass/GlassCard.tsx
"use client";

import { cx } from "@repo/ui/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Pure-CSS Vision-OS-style glass card. Uses backdrop-filter blur, inner
 * highlights, and an edge gradient. Renders without any JS dependency
 * and without the per-element SVG displacement filter (which would
 * tank scroll perf if applied per-card).
 *
 * The Glass variant wraps this in `LiquidGlassHover` which only swaps
 * to the real-displacement `liquid-glass-react` while a single card is
 * hovered.
 */
export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div
      className={cx("relative overflow-hidden rounded-[22px]", className)}
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
        backdropFilter: "blur(28px) saturate(1.3)",
        WebkitBackdropFilter: "blur(28px) saturate(1.3)",
        border: "1px solid rgba(255,255,255,0.16)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(255,255,255,0.05), inset 0 0 50px rgba(127,184,154,0.08), 0 30px 60px rgba(0,0,0,0.5), 0 6px 16px rgba(0,0,0,0.3)",
      }}
    >
      {/* edge light */}
      <span
        className="pointer-events-none absolute left-0 right-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
        }}
      />
      {/* upper-left glow */}
      <span
        className="pointer-events-none absolute -left-8 -top-8 h-32 w-32"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)",
          filter: "blur(20px)",
        }}
      />
      {children}
    </div>
  );
}
