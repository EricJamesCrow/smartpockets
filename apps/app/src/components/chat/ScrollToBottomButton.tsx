"use client";

import { ArrowDown } from "@untitledui/icons";
import { AnimatePresence, motion } from "motion/react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { cx } from "@/utils/cx";

interface ScrollToBottomButtonProps {
  className?: string;
}

export function ScrollToBottomButton({ className }: ScrollToBottomButtonProps) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  return (
    <AnimatePresence>
      {!isAtBottom && (
        <motion.button
          type="button"
          onClick={() => scrollToBottom()}
          aria-label="Scroll to latest message"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className={cx(
            "absolute bottom-4 left-1/2 z-10 -translate-x-1/2",
            "flex size-9 items-center justify-center rounded-full",
            "border border-secondary bg-primary shadow-md transition-colors hover:bg-secondary",
            "dark:border-[var(--sp-moss-line-strong)] dark:bg-[var(--sp-surface-panel-strong)] dark:hover:border-white/20",
            className,
          )}
        >
          <ArrowDown className="size-4 text-secondary" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
