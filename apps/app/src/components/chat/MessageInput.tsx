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
    <div className="bg-primary px-4 pb-6 pt-2 md:px-8">
      <div className="mx-auto max-w-4xl">
        <MessageActionMinimal
          onSubmit={onSend}
          onStop={onStop}
          isLoading={isLoading}
          isStreaming={isStreaming}
          disabled={disabled}
          className="w-full"
        />
        <p className="sp-kicker mt-3 text-center text-tertiary dark:text-stone-500">
          Assistant can make mistakes &middot; check important info
        </p>
      </div>
    </div>
  );
}
