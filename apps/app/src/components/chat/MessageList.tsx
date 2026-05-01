"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { StickToBottom } from "use-stick-to-bottom";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ScrollToBottomButton } from "@/components/chat/ScrollToBottomButton";

type AgentMessage = Doc<"agentMessages">;

interface MessageListProps {
  threadId: Id<"agentThreads"> | null;
  /**
   * A synthesized user message rendered in-line with the real query rows so the
   * UI reflects the just-typed prompt during the 100–400ms before the real
   * `agentMessages` row arrives. The list dedupes against the query: once a
   * matching real row appears, the optimistic copy disappears (single source of
   * truth — no parallel render block, no flicker).
   */
  optimisticUserMessage?: AgentMessage | null;
  onMessagesLoaded?: () => void;
  onRegenerate?: (message: AgentMessage) => Promise<void> | void;
}

export function MessageList({
  threadId,
  optimisticUserMessage,
  onMessagesLoaded,
  onRegenerate,
}: MessageListProps) {
  const messages = useQuery(
    api.agent.threads.listMessages,
    threadId ? { threadId } : "skip",
  ) as AgentMessage[] | undefined;

  // Merge the optimistic user message into the list when present and not yet
  // superseded by a matching real row.
  const displayMessages = useMemo<AgentMessage[]>(() => {
    if (!messages) return [];
    if (!optimisticUserMessage) return messages;
    const optimisticText = optimisticUserMessage.text?.trim();
    const alreadyInQuery = optimisticText
      ? messages.some(
          (m) => m.role === "user" && m.text?.trim() === optimisticText,
        )
      : false;
    if (alreadyInQuery) return messages;
    return [...messages, optimisticUserMessage];
  }, [messages, optimisticUserMessage]);

  useEffect(() => {
    if (messages && onMessagesLoaded) onMessagesLoaded();
  }, [messages, onMessagesLoaded]);

  if (!threadId) return null;
  if (messages === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <StickToBottom
      className="relative flex flex-1 flex-col overflow-hidden"
      resize="smooth"
      initial="instant"
    >
      <StickToBottom.Content
        role="log"
        aria-live="polite"
        className="flex-1 space-y-6 overflow-y-auto px-4 py-6 md:px-8"
      >
        {displayMessages.map((message) => (
          <MessageBubble
            key={message._id}
            message={message}
            threadId={threadId}
            onRegenerate={
              onRegenerate && message.role === "assistant"
                ? () => onRegenerate(message)
                : undefined
            }
          />
        ))}
      </StickToBottom.Content>
      <ScrollToBottomButton />
    </StickToBottom>
  );
}
