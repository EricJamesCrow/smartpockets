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
  /**
   * CROWDEV-343 (FIX 7): a synthesized assistant message with `isStreaming:
   * true` and empty `text`. Rendered as the bouncing-dots typing indicator
   * by `MessageBubble` while waiting for the first real assistant token.
   * Suppressed once a real assistant row lands ordered after the latest
   * user turn (whether real or optimistic).
   */
  optimisticAssistantMessage?: AgentMessage | null;
  onMessagesLoaded?: () => void;
  onRegenerate?: (message: AgentMessage) => Promise<void> | void;
}

export function MessageList({
  threadId,
  optimisticUserMessage,
  optimisticAssistantMessage,
  onMessagesLoaded,
  onRegenerate,
}: MessageListProps) {
  const messages = useQuery(
    api.agent.threads.listMessages,
    threadId ? { threadId } : "skip",
  ) as AgentMessage[] | undefined;

  // The real query row has caught up to the optimistic prompt — used both to
  // suppress the optimistic copy in `displayMessages` and to fire
  // `onMessagesLoaded` exactly once on the transition.
  const matched = useMemo(() => {
    if (!messages || !optimisticUserMessage) return false;
    const t = optimisticUserMessage.text?.trim();
    return Boolean(t) && messages.some((m) => m.role === "user" && m.text?.trim() === t);
  }, [messages, optimisticUserMessage]);

  // Merge the optimistic user + assistant messages into the list when each is
  // present and not yet superseded by a matching real row. The user copy is
  // dedup'd by text-match (`matched`); the assistant copy is dedup'd by the
  // parent (ChatView) which only emits `optimisticAssistantMessage` while no
  // real assistant row has landed after the latest user turn — so we just
  // append it when present.
  const displayMessages = useMemo<AgentMessage[]>(() => {
    if (!messages) {
      const out: AgentMessage[] = [];
      if (optimisticUserMessage) out.push(optimisticUserMessage);
      if (optimisticAssistantMessage) out.push(optimisticAssistantMessage);
      return out;
    }
    const base = matched
      ? messages
      : optimisticUserMessage
        ? [...messages, optimisticUserMessage]
        : messages;
    return optimisticAssistantMessage ? [...base, optimisticAssistantMessage] : base;
  }, [messages, optimisticUserMessage, optimisticAssistantMessage, matched]);

  useEffect(() => {
    if (matched) onMessagesLoaded?.();
  }, [matched, onMessagesLoaded]);

  const isStreaming =
    optimisticAssistantMessage?.isStreaming === true ||
    (messages ?? []).some((m) => m.role === "assistant" && m.isStreaming === true);

  // First-send window: threadId is still null (or arrived but query not yet
  // returned) AND we have an optimistic bubble to show. Mount StickToBottom
  // with the optimistic-only list so the layout doesn't shift when threadId
  // arrives or when the real row lands. Skip the spinner — we have a real
  // message to show; the spinner is for the thread-fetch loading state where
  // we have nothing to render.
  if (!threadId || messages === undefined) {
    if (optimisticUserMessage || optimisticAssistantMessage) {
      return (
        <StickToBottom
          className="relative flex flex-1 flex-col overflow-hidden"
          resize="smooth"
          initial="instant"
        >
          <StickToBottom.Content
            role="log"
            aria-live="polite"
            aria-busy={isStreaming}
            className="flex-1 space-y-6 overflow-y-auto px-4 py-6 md:px-8"
          >
            {optimisticUserMessage && (
              <MessageBubble
                key={optimisticUserMessage._id}
                message={optimisticUserMessage}
                threadId={optimisticUserMessage.agentThreadId}
              />
            )}
            {optimisticAssistantMessage && (
              <MessageBubble
                key={optimisticAssistantMessage._id}
                message={optimisticAssistantMessage}
                threadId={optimisticAssistantMessage.agentThreadId}
              />
            )}
          </StickToBottom.Content>
          <ScrollToBottomButton />
        </StickToBottom>
      );
    }
    if (!threadId) return null;
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
        aria-busy={isStreaming}
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
