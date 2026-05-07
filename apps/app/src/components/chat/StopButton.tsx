"use client";

import { Stop } from "@untitledui/icons";
import { motion } from "motion/react";
import { SP_TRANSITION_FAST } from "@/lib/motion/tokens";

interface StopButtonProps {
  onStop: () => void;
  disabled?: boolean;
}

/**
 * Stop button shown in place of the send button while the assistant is
 * streaming. Sized 44px on mobile (size-11), 36px on desktop (md:size-9) to
 * match `MessageActionMinimal`'s send button so the swap is visually flat.
 *
 * Entrance uses `SP_TRANSITION_FAST` (150ms, productive ease) so the swap
 * doesn't read as a layout flicker.
 */
export function StopButton({ onStop, disabled }: StopButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onStop}
      disabled={disabled}
      aria-label="Stop generating"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SP_TRANSITION_FAST}
      className="flex size-11 items-center justify-center rounded-full bg-brand-solid text-white shadow-[0_4px_14px_rgba(127,184,154,0.25)] transition-all duration-[var(--sp-motion-fast)] hover:scale-[1.04] hover:brightness-110 active:scale-[0.96] active:brightness-95 disabled:opacity-40 md:size-9"
    >
      <Stop className="size-4" />
    </motion.button>
  );
}
