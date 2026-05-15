// apps/app/src/components/wallets/variants/champagne-leather/CardSpotlight.tsx
"use client";

import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";

interface CardSpotlightProps {
  children: React.ReactNode;
  /** Radius of the spotlight in pixels. */
  radius?: number;
  /** Spotlight tint — defaults to warm cream-white for the leather material. */
  color?: string;
  className?: string;
}

/**
 * Mouse-tracked radial spotlight for the Champagne Leather variant.
 *
 * Same Aceternity-style `feMotionTemplate` technique as Variant E, but with
 * a warm cream-white tint instead of cool champagne. The leather material
 * is already warm, so the spotlight reads as soft light catching the
 * polish rather than a separate color wash.
 *
 * Renders invisible at rest; fades in over 300ms on group-hover. Place a
 * `group` class on a parent wrapper for the opacity transition to fire.
 */
export function CardSpotlight({
  children,
  radius = 260,
  color = "rgba(255,245,215,0.22)",
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
        className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background, mixBlendMode: "soft-light" }}
      />
      {children}
    </div>
  );
}
