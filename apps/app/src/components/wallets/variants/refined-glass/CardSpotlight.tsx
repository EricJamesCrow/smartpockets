// apps/app/src/components/wallets/variants/refined-glass/CardSpotlight.tsx
"use client";

import { useRef } from "react";
import { motion, useMotionValue, useMotionTemplate } from "motion/react";

interface CardSpotlightProps {
  children: React.ReactNode;
  /** Radius of the spotlight in pixels. */
  radius?: number;
  /** Spotlight tint — defaults to champagne at low alpha. */
  color?: string;
  className?: string;
}

/**
 * Mouse-tracked radial spotlight overlay. Renders nothing visible until
 * the user hovers the wrapper; then a soft circular highlight follows
 * the cursor. Used by the Refined + Glass variant to surface the glass
 * material's "wetness" under cursor.
 *
 * Adapted from https://ui.aceternity.com/components/card-spotlight using
 * Motion v12's `useMotionValue` + `useMotionTemplate` API.
 */
export function CardSpotlight({
  children,
  radius = 240,
  color = "rgba(212,197,156,0.18)",
  className,
}: CardSpotlightProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const background = useMotionTemplate`radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, ${color}, transparent 70%)`;

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      className={className}
      style={{ position: "relative" }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      {children}
    </div>
  );
}
