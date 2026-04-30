"use client";

import { MessageActionMinimal } from "@/components/chat/MessageActionMinimal";

interface MessageInputProps {
  onSend: (message: string) => Promise<void> | void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function MessageInput({ onSend, isLoading, disabled }: MessageInputProps) {
  return (
    <div className="bg-primary px-4 pb-6 pt-2 md:px-8">
      <div className="mx-auto max-w-4xl">
        <MessageActionMinimal
          onSubmit={onSend}
          isLoading={isLoading}
          disabled={disabled}
          className="w-full"
        />
        <p className="mt-3 text-center font-[family-name:var(--font-geist-mono)] text-[0.65rem] uppercase tracking-[0.22em] text-tertiary dark:text-stone-500">
          Assistant can make mistakes &middot; check important info
        </p>
      </div>
    </div>
  );
}
