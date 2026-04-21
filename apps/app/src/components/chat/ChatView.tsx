"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { ChatBanner, type ChatBannerState } from "@/components/chat/ChatBanner";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatErrorBoundary } from "@/components/chat/ChatErrorBoundary";
import { ChatHome } from "@/components/chat/ChatHome";
import {
  ChatInteractionProvider,
  TypedAgentError,
  useChatInteraction,
  type AgentError,
} from "@/components/chat/ChatInteractionContext";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { ReconsentModal } from "@/components/chat/ReconsentModal";

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

function translateError(err: unknown): AgentError | null {
  if (err instanceof TypedAgentError) return err.data;
  const data = (err as { data?: { kind?: string; plaidItemId?: string } })?.data;
  if (data?.kind === "reconsent_required" && data.plaidItemId) {
    return { kind: "reconsent_required", plaidItemId: data.plaidItemId };
  }
  if (data?.kind === "first_turn_guard") return { kind: "first_turn_guard" };
  if (data?.kind === "proposal_timed_out") return { kind: "proposal_timed_out" };
  if (data?.kind === "proposal_invalid_state") return { kind: "proposal_invalid_state" };
  return null;
}

function ChatViewBody({ threadId }: { threadId: Id<"agentThreads"> | null }) {
  const { sendMessage } = useChatInteraction();
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticPrompt, setOptimisticPrompt] = useState<string | null>(null);
  const [banner, setBanner] = useState<ChatBannerState | null>(null);
  const [reconsent, setReconsent] = useState<{ plaidItemId: string } | null>(null);

  // W2 emits a role: "system" row during provider outages; surface the most
  // recent one as llm_down.
  const messages = useQuery(
    api.agent.threads.listMessages,
    threadId ? { threadId } : "skip",
  ) as Doc<"agentMessages">[] | undefined;

  useEffect(() => {
    const systemRow = messages
      ?.filter((m) => m.role === "system")
      .find((m) => /temporarily unavailable|offline/i.test(m.text ?? ""));
    if (systemRow) setBanner({ kind: "llm_down" });
  }, [messages]);

  const routeError = (err: unknown) => {
    const typed = translateError(err);
    if (!typed) {
      console.error("[ChatView] unexpected error", err);
      return;
    }
    switch (typed.kind) {
      case "rate_limited":
      case "budget_exhausted":
      case "llm_down":
        setBanner(typed);
        return;
      case "reconsent_required":
        setReconsent({ plaidItemId: typed.plaidItemId });
        return;
      case "first_turn_guard":
      case "proposal_timed_out":
      case "proposal_invalid_state":
        console.info("[ChatView]", typed.kind);
        return;
    }
  };

  const handleSend = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setOptimisticPrompt(trimmed);
    setBanner(null);
    try {
      await sendMessage({ text: trimmed });
    } catch (err) {
      routeError(err);
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
      {banner && <ChatBanner state={banner} onDismiss={() => setBanner(null)} />}
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
      {reconsent && (
        <ReconsentModal
          plaidItemId={reconsent.plaidItemId}
          onDismiss={() => setReconsent(null)}
        />
      )}
    </ChatContainer>
  );
}
