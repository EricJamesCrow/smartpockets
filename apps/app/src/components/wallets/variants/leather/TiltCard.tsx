// apps/app/src/components/wallets/variants/leather/TiltCard.tsx
"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionStyle,
} from "motion/react";
import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";

/**
 * Aceternity-style 3D tilt shell for the leather wallet.
 *
 * Mouse position over the card is mapped to a small rotateX/rotateY tilt
 * (capped at ±3°) via `useMotionValue` → `useSpring` → `useTransform`. The
 * spring smooths the otherwise twitchy pointer signal. On `pointerLeave`
 * the tilt values are reset to 0 so the spring eases back to flat.
 *
 * The motion is intentionally restrained (3° not 15°): the goal is to make
 * the leather feel like a solid physical object the user is tilting in
 * their hand, not a flashy 3D card-flip showcase.
 *
 * `perspective` is set on the outer wrapper so the inner child's transform
 * picks up the foreshortening. The child receives `transformStyle:
 * preserve-3d` so any future nested `translateZ` layers (foil dot,
 * stitching shadow) render in perspective without each child fighting the
 * parent for the transform stack.
 */

const MAX_TILT_DEG = 3;
const SPRING_CONFIG = { stiffness: 220, damping: 22, mass: 0.6 };

interface TiltCardProps {
  children: ReactNode;
  /** Forwarded onto the inner motion.div so callers can style the chassis */
  className?: string;
  /** Forwarded onto the inner motion.div */
  style?: CSSProperties;
  /** Click handler — caller wires this to nav-to-cards */
  onClick?: () => void;
  /** Hover handlers — caller toggles `isHovered` for mini-card fan-out */
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  /** Forwarded onto the outer wrapper so tests can grab the root */
  "data-testid"?: string;
  "data-variant"?: string;
}

export function TiltCard({
  children,
  className,
  style,
  onClick,
  onPointerEnter,
  onPointerLeave,
  ...dataAttrs
}: TiltCardProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Raw mouse-position-driven values; range is [-MAX_TILT_DEG, MAX_TILT_DEG]
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Springs smooth the pointer signal so 60fps mousemove → buttery rotation
  const smoothX = useSpring(mouseX, SPRING_CONFIG);
  const smoothY = useSpring(mouseY, SPRING_CONFIG);

  // y-pointer-position → rotateX (top of card pushes back when cursor near top)
  // x-pointer-position → rotateY (right side comes forward when cursor right)
  const rotateX = useTransform(smoothY, (value) => -value);
  const rotateY = useTransform(smoothX, (value) => value);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const element = wrapperRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    // Normalize cursor position to [-1, 1] across the card, then scale to ±MAX
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(px * MAX_TILT_DEG * 2);
    mouseY.set(py * MAX_TILT_DEG * 2);
  };

  const handlePointerLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    onPointerLeave?.();
  };

  const innerStyle: MotionStyle = {
    rotateX,
    rotateY,
    transformStyle: "preserve-3d",
    ...style,
  };

  return (
    <div
      ref={wrapperRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      style={{ perspective: 1000 }}
      className="group relative cursor-pointer"
      {...dataAttrs}
    >
      <motion.div className={className} style={innerStyle}>
        {children}
      </motion.div>
    </div>
  );
}
