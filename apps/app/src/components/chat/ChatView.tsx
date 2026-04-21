"use client";

import type { Id } from "@convex/_generated/dataModel";

interface ChatViewProps {
  initialThreadId?: Id<"agentThreads">;
}

export function ChatView({ initialThreadId }: ChatViewProps) {
  return (
    <div className="flex h-screen items-center justify-center p-8">
      <div className="max-w-md text-center">
        <p className="text-lg font-semibold text-primary">Chat home</p>
        <p className="mt-2 text-sm text-tertiary">
          {initialThreadId ? `Thread: ${initialThreadId}` : "New conversation"}
        </p>
        <p className="mt-4 text-xs text-quaternary">
          T-3 will render the real chat surface here.
        </p>
      </div>
    </div>
  );
}
