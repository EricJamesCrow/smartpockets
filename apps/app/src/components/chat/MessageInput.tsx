"use client";

import { MessageActionMinimal } from "@/components/chat/MessageActionMinimal";

interface MessageInputProps {
  onSend: (message: string) => Promise<void> | void;
  onStop?: () => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  onStop,
  isLoading,
  isStreaming,
  disabled,
}: MessageInputProps) {
  return (
    <div className="bg-primary px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 md:px-8">
      <div className="mx-auto max-w-4xl">
        <MessageActionMinimal
          onSubmit={onSend}
          onStop={onStop}
          isLoading={isLoading}
          isStreaming={isStreaming}
          disabled={disabled}
          className="w-full"
        />
        {/*
          CROWDEV-390: `dark:text-stone-500` (rgb 120 113 108) on bg-primary
          (rgb 8 10 12) only clears 4.13:1 — borderline AA, fails 4.5:1 once
          Tailwind's utility wins over `.sp-kicker`'s `var(--sp-microcopy)`
          color rule (cascade-order dependent). The `.sp-kicker` color rule
          currently wins (rendering at 7.66:1), but bumping the fallback to
          `dark:text-stone-400` (rgb 168 162 158 → 7.86:1) keeps this
          AA-clear even if the kicker class color rule is ever removed or
          overridden by a more specific selector. Defense-in-depth.
        */}
        <p className="sp-kicker mt-3 text-center text-tertiary dark:text-stone-400">
          Agent can make mistakes &middot; check important info
        </p>
      </div>
    </div>
  );
}
