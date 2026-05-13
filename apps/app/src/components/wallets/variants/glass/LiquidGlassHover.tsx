// apps/app/src/components/wallets/variants/glass/LiquidGlassHover.tsx
"use client";

import { useState } from "react";
import LiquidGlass from "liquid-glass-react";
import { useIsChromium } from "./use-is-chromium";

interface LiquidGlassHoverProps {
  children: React.ReactNode;
  /** Currently-hovered state from the parent. When true and isChromium, mount LiquidGlass. */
  isHovered: boolean;
  /** Same border-radius as the wrapped card. */
  cornerRadius?: number;
}

/**
 * Renders children inside `liquid-glass-react` ONLY when hovered AND
 * Chromium. Otherwise renders children directly (the parent GlassCard
 * already provides flat backdrop-filter blur).
 *
 * This enforces the "one displacement instance max" rule from the spec:
 * because only the actively-hovered card mounts LiquidGlass, you can
 * never have more than one displacement filter active in the DOM.
 */
export function LiquidGlassHover({
  children,
  isHovered,
  cornerRadius = 22,
}: LiquidGlassHoverProps) {
  const isChromium = useIsChromium();
  const [hasEntered, setHasEntered] = useState(false);

  // Defer mounting LiquidGlass until first hover so SSR + initial paint
  // is unaffected by the heavy filter.
  if (isHovered && !hasEntered) setHasEntered(true);

  if (!isChromium || !hasEntered) {
    return <>{children}</>;
  }

  return (
    <LiquidGlass
      displacementScale={isHovered ? 64 : 0}
      blurAmount={0.1}
      saturation={140}
      aberrationIntensity={isHovered ? 2 : 0}
      elasticity={0.35}
      cornerRadius={cornerRadius}
    >
      {children}
    </LiquidGlass>
  );
}
