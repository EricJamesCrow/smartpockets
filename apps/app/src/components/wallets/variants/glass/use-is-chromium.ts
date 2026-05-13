// apps/app/src/components/wallets/variants/glass/use-is-chromium.ts
"use client";

import { useEffect, useState } from "react";

/**
 * Feature-detect support for SVG-as-backdrop-filter (the technique
 * required for true Liquid Glass displacement). Only Chromium-family
 * browsers support it today.
 *
 * Returns `false` initially (SSR-safe) and `true` after mount if both
 * conditions hold:
 *   1. CSS.supports("backdrop-filter: blur(1px)") — base feature
 *   2. user agent is Chrome/Edge/Brave/Arc (not Safari/Firefox)
 *
 * Used by the Glass variant to decide whether to mount `liquid-glass-react`
 * (Chromium) or fall back to a flat tinted glass card (Safari/Firefox).
 */
export function useIsChromium(): boolean {
  const [isChromium, setIsChromium] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent;
    const isFirefox = ua.includes("Firefox");
    const isSafari =
      ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("Chromium");

    const supportsBackdrop =
      typeof CSS !== "undefined" &&
      CSS.supports("backdrop-filter", "blur(1px)");

    setIsChromium(!isFirefox && !isSafari && supportsBackdrop);
  }, []);

  return isChromium;
}
