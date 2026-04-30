"use client";

import { MessageActionMinimal } from "@/components/chat/MessageActionMinimal";

interface MessageInputProps {
  onSend: (message: string) => Promise<void> | void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function MessageInput({ onSend, isLoading, disabled }: MessageInputProps) {
  return (
    <div className="border-t border-white/[0.06] bg-primary px-4 pb-6 pt-3 md:px-8">
      <div className="mx-auto max-w-4xl">
        <MessageActionMinimal
          onSubmit={onSend}
          isLoading={isLoading}
          disabled={disabled}
          className="w-full"
        />
        <p className="mt-2 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-600">
          ⚠ AGENT MAY ERR · VERIFY CRITICAL READOUTS
        </p>
      </div>
    </div>
  );
}
