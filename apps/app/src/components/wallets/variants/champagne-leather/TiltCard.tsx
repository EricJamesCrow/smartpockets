// apps/app/src/components/wallets/variants/champagne-leather/TiltCard.tsx
"use client";

interface TiltCardProps {
  children: React.ReactNode;
  /**
   * Maximum tilt angle in degrees. Default 2 (less than Variant A's 3) per
   * spec §6 Variant C. Used as the static hover-state tilt rather than a
   * mouse-tracked amplitude.
   */
  maxTilt?: number;
  className?: string;
}

/**
 * Subtle 3D tilt for the Champagne Leather variant.
 *
 * The original implementation mouse-tracked a `useSpring`-smoothed rotation
 * from `useMotionValue`. That broke the dropdown trigger: the spring kept
 * animating between mousedown and mouseup (≈1ms in Playwright, a few ms
 * for real users), and the resulting motion shifted the kebab button out
 * from under the cursor. The native click then landed on whatever was at
 * the press coordinates (chassis or page body) and the card's onClick
 * navigated to /credit-cards instead of opening the menu — deterministic
 * in CI, flaky in production.
 *
 * Replacement: a static rest/hover transform pair driven by JS mouseenter
 * / mouseleave with a CSS `transition`. No spring, no per-frame mousemove
 * recalculation. The chassis settles into a fixed tilt on hover and back
 * to flat on leave; the dropdown trigger never moves while the cursor is
 * stationary, so mousedown and mouseup hit the same element.
 */
export function TiltCard({
  children,
  maxTilt = 2,
  className,
}: TiltCardProps) {
  const restTransform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
  const hoverTransform = `perspective(1000px) rotateX(${-maxTilt / 2}deg) rotateY(${maxTilt / 2}deg)`;

  return (
    <div
      className={className}
      style={{
        transformStyle: "preserve-3d",
        transform: restTransform,
        transition: "transform 250ms ease-out",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = hoverTransform;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = restTransform;
      }}
    >
      {children}
    </div>
  );
}
