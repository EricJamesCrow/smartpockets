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
 * Architectural Glass hover-only displacement wrapper.
 *
 * Renders the children (a `GlassCard` with the wallet UI) and — on
 * hover, Chromium-only — overlays a `liquid-glass-react` instance as
 * a `position: absolute; inset: 0; pointer-events: none` layer behind
 * the children. That overlay's `backdrop-filter: url(#filter)` applies
 * the `feDisplacementMap` + chromatic-aberration filter to what's
 * directly underneath it (the page-level ambient color blobs), giving
 * the hovered card the true Liquid-Glass visual without wrapping/
 * reflowing the card content.
 *
 * Why not wrap the children directly?
 * --------------------------------
 * `liquid-glass-react` applies `position: relative; transform:
 * translate(-50%, -50%)` plus an elasticity offset to whatever it
 * wraps. Inside a CSS grid that anchors the visual content outside its
 * grid cell — the card snaps up-left on hover and slides under the
 * sidebar. Using LiquidGlass as a backdrop overlay sidesteps that:
 * GlassCard owns layout, LiquidGlass owns the visual effect.
 *
 * "One displacement instance max" rule from the spec still holds:
 * the overlay only mounts while a single card is hovered.
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

  return (
    <div className="relative">
      {/* GlassCard owns the layout and pointer events */}
      {children}

      {/* LiquidGlass overlay — applies `backdrop-filter: url(#filter)`
       *  with feDisplacementMap to whatever is BEHIND this layer
       *  (the page-level ambient color blobs), giving the hovered
       *  card the true Liquid-Glass visual. `pointer-events: none`
       *  keeps clicks flowing through to the GlassCard underneath. */}
      {isChromium && hasEntered && (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ borderRadius: cornerRadius }}
          aria-hidden
        >
          <LiquidGlass
            displacementScale={isHovered ? 64 : 0}
            blurAmount={0.1}
            saturation={140}
            aberrationIntensity={isHovered ? 2 : 0}
            elasticity={0}
            cornerRadius={cornerRadius}
            padding="0"
          >
            {/* Empty span — LiquidGlass applies its backdrop-filter
             *  effect to what's behind it regardless of children. */}
            <span style={{ display: "block", width: "100%", height: "100%" }} />
          </LiquidGlass>
        </div>
      )}
    </div>
  );
}
