"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Id } from "@convex/_generated/dataModel";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatErrorBoundary } from "@/components/chat/ChatErrorBoundary";
import { ChatHome } from "@/components/chat/ChatHome";
import {
  ChatInteractionProvider,
  useChatInteraction,
} from "@/components/chat/ChatInteractionContext";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";

interface ChatViewProps {
  initialThreadId?: Id<"agentThreads">;
}

export function ChatView({ initialThreadId }: ChatViewProps) {
  const [threadId, setThreadId] = useState<Id<"agentThreads"> | null>(initialThreadId ?? null);
  const router = useRouter();

  const handleThreadIdChange = (nextId: Id<"agentThreads">) => {
    setThreadId(nextId);
    router.push(`/${nextId}`);
  };

  return (
    <ChatErrorBoundary>
      <ChatInteractionProvider
        threadId={threadId ?? undefined}
        onThreadIdChange={handleThreadIdChange}
      >
        <ChatViewBody threadId={threadId} />
      </ChatInteractionProvider>
    </ChatErrorBoundary>
  );
}

function ChatViewBody({ threadId }: { threadId: Id<"agentThreads"> | null }) {
  const { sendMessage } = useChatInteraction();
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticPrompt, setOptimisticPrompt] = useState<string | null>(null);

  const handleSend = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setOptimisticPrompt(trimmed);
    try {
      await sendMessage({ text: trimmed });
    } catch (err) {
      console.error("[ChatView] sendMessage failed", err);
      setOptimisticPrompt(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessagesLoaded = () => {
    if (threadId) setOptimisticPrompt(null);
  };

  return (
    <ChatContainer>
      {!threadId && !optimisticPrompt ? (
        <ChatHome onSend={handleSend} />
      ) : (
        <MessageList
          threadId={threadId}
          optimisticPrompt={optimisticPrompt}
          onMessagesLoaded={handleMessagesLoaded}
        />
      )}
      <MessageInput onSend={handleSend} isLoading={isLoading} />
    </ChatContainer>
  );
}
