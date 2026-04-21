"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { MessageBubble } from "@/components/chat/MessageBubble";

type AgentMessage = Doc<"agentMessages">;

interface MessageListProps {
  threadId: Id<"agentThreads"> | null;
  optimisticPrompt?: string | null;
  onMessagesLoaded?: () => void;
  onRegenerate?: (message: AgentMessage) => Promise<void> | void;
}

export function MessageList({
  threadId,
  optimisticPrompt,
  onMessagesLoaded,
  onRegenerate,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  const messages = useQuery(api.agent.threads.listMessages, threadId ? { threadId } : "skip") as
    | AgentMessage[]
    | undefined;

  const normalized = optimisticPrompt?.trim();
  const matched =
    normalized && messages
      ? messages.some((m) => m.role === "user" && m.text?.trim() === normalized)
      : false;
  const showOptimistic = Boolean(normalized && !matched);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, showOptimistic]);

  useEffect(() => {
    if (matched && onMessagesLoaded) onMessagesLoaded();
  }, [matched, onMessagesLoaded]);

  if (!threadId && !optimisticPrompt) return null;

  if (messages === undefined && !optimisticPrompt) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      role="log"
      aria-live="polite"
      className="flex-1 space-y-6 overflow-y-auto px-4 py-6 md:px-8"
    >
      {messages?.map((message) => (
        <MessageBubble
          key={message._id}
          message={message}
          threadId={threadId!}
          onRegenerate={
            onRegenerate && message.role === "assistant"
              ? () => onRegenerate(message)
              : undefined
          }
        />
      ))}
      {showOptimistic && normalized && (
        <>
          <div className="group/msg flex flex-row-reverse gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-solid text-xs font-semibold text-white">
              You
            </div>
            <div className="flex max-w-[80%] flex-col items-end gap-1">
              <div className="rounded-2xl rounded-tr-none bg-brand-solid px-5 py-3 text-sm text-white">
                <p className="whitespace-pre-wrap leading-relaxed">{normalized}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary">
              SP
            </div>
            <div className="min-h-[42px] rounded-2xl rounded-tl-none bg-secondary px-5 py-3 text-sm text-primary">
              <div className="flex gap-1">
                <span className="size-2 animate-bounce rounded-full bg-tertiary" />
                <span
                  className="size-2 animate-bounce rounded-full bg-tertiary"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="size-2 animate-bounce rounded-full bg-tertiary"
                  style={{ animationDelay: "0.3s" }}
                />
              </div>
            </div>
          </div>
        </>
      )}
      <div ref={endRef} />
    </div>
  );
}
