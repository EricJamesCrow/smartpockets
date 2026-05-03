"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { useMutation } from "convex/react";
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

type AgentMessage = Doc<"agentMessages">;

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

/**
 * Build a synthesized user-role row that satisfies `Doc<"agentMessages">`'s
 * shape closely enough for `MessageBubble` to render it. The cast is local —
 * `MessageBubble` only reads `_id` (React key), `role`, `text`, and
 * `isStreaming`, so the synthesized fields are sufficient.
 */
function buildOptimisticUserMessage(
  prompt: string,
  threadId: Id<"agentThreads"> | null,
): AgentMessage {
  const now = Date.now();
  return {
    _id: `optimistic_${now}` as Id<"agentMessages">,
    _creationTime: now,
    agentThreadId: (threadId ?? "optimistic_thread") as Id<"agentThreads">,
    role: "user",
    text: prompt,
    createdAt: now,
    isStreaming: false,
  } as AgentMessage;
}

/**
 * Build a synthesized assistant-role row that renders as the typing
 * indicator. `MessageBubble` keys on `isStreaming && (!text || text === "")`
 * to swap into the bouncing-dots affordance, so we set both. The id is
 * suffixed `_assistant` to keep React keys distinct from the user
 * counterpart. CROWDEV-343: this restores the parallel "user bubble +
 * thinking dots" UX that was dropped when PR #156 unified the optimistic
 * render path. Dedup logic in MessageList drops this row once a real
 * assistant message arrives ordered after the latest user turn.
 */
function buildOptimisticAssistantMessage(
  threadId: Id<"agentThreads"> | null,
): AgentMessage {
  const now = Date.now();
  return {
    _id: `optimistic_assistant_${now}` as Id<"agentMessages">,
    _creationTime: now,
    agentThreadId: (threadId ?? "optimistic_thread") as Id<"agentThreads">,
    role: "assistant",
    text: "",
    createdAt: now,
    isStreaming: true,
  } as AgentMessage;
}

function ChatViewBody({ threadId }: { threadId: Id<"agentThreads"> | null }) {
  const { sendMessage } = useChatInteraction();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [banner, setBanner] = useState<ChatBannerState | null>(null);
  const [reconsent, setReconsent] = useState<{ plaidItemId: string } | null>(null);
  const abortRun = useMutation(api.agent.threads.abortRun);

  // W2 emits a role: "system" row during provider outages; surface the most
  // recent one as llm_down.
  const messages = useQuery(
    api.agent.threads.listMessages,
    threadId ? { threadId } : "skip",
  ) as AgentMessage[] | undefined;

  // Streaming detection. The user-turn marker is inserted with
  // `isStreaming: true`, and the run is "in flight" until either an assistant
  // row lands ordered after the user row, or `abortRun` flips the flag.
  // Derivation requires BOTH signals so the stop button doesn't linger if one
  // signal lags (assistant row already landed but user-marker flag wasn't
  // patched, or vice versa).
  const isStreaming = useMemo(() => {
    if (!messages || messages.length === 0) return false;
    const lastUser = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUser || lastUser.isStreaming !== true) return false;
    const hasAssistantAfter = messages.some(
      (m) =>
        m.role === "assistant" &&
        (m._creationTime ?? 0) > (lastUser._creationTime ?? 0),
    );
    return !hasAssistantAfter;
  }, [messages]);

  const handleStop = useCallback(async () => {
    if (!threadId) return;
    try {
      await abortRun({ threadId });
    } catch (err) {
      console.error("[ChatView] abortRun failed", err);
    }
  }, [abortRun, threadId]);

  useEffect(() => {
    const latestSystemRow = messages
      ?.filter((m) => m.role === "system")
      .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0))[0];
    if (/temporarily unavailable|offline/i.test(latestSystemRow?.text ?? "")) {
      setBanner({ kind: "llm_down" });
    } else {
      setBanner((current) => (current?.kind === "llm_down" ? null : current));
    }
  }, [messages]);

  const optimisticUserMessage = useMemo<AgentMessage | null>(() => {
    if (!pendingPrompt) return null;
    return buildOptimisticUserMessage(pendingPrompt, threadId);
  }, [pendingPrompt, threadId]);

  // CROWDEV-343 (FIX 7): when a turn is in flight and no assistant row has
  // landed yet, surface a synthesized "thinking" assistant row so the bubble
  // renders bouncing dots immediately on send. Three predicates must hold:
  //   1. We have a pending prompt (the user just sent something).
  //   2. EITHER no thread query yet (first send: threadId still null)
  //      OR no assistant row ordered after the latest user row in the
  //      current messages list.
  // The MessageList dedupe + MessageBubble's isStreaming-without-text
  // rendering close the loop visually.
  const optimisticAssistantMessage = useMemo<AgentMessage | null>(() => {
    if (!pendingPrompt) return null;
    if (!messages) return buildOptimisticAssistantMessage(threadId);
    // Find latest user row; if no assistant row creation-time-after it, we're still waiting.
    const latestUser = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    const latestUserCreated = latestUser?._creationTime ?? 0;
    const hasAssistantAfter = messages.some(
      (m) => m.role === "assistant" && (m._creationTime ?? 0) > latestUserCreated,
    );
    if (hasAssistantAfter) return null;
    return buildOptimisticAssistantMessage(threadId);
  }, [pendingPrompt, messages, threadId]);

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
    setPendingPrompt(trimmed);
    setBanner(null);
    try {
      await sendMessage({ text: trimmed });
    } catch (err) {
      routeError(err);
      setPendingPrompt(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessagesLoaded = useCallback(() => {
    setPendingPrompt(null);
  }, []);

  return (
    <ChatContainer>
      {banner && <ChatBanner state={banner} onDismiss={() => setBanner(null)} />}
      {!threadId && !pendingPrompt ? (
        <ChatHome onSend={handleSend} />
      ) : (
        <MessageList
          threadId={threadId}
          optimisticUserMessage={optimisticUserMessage}
          optimisticAssistantMessage={optimisticAssistantMessage}
          onMessagesLoaded={handleMessagesLoaded}
        />
      )}
      <MessageInput
        onSend={handleSend}
        onStop={handleStop}
        isLoading={isLoading}
        isStreaming={isStreaming}
      />
      {reconsent && (
        <ReconsentModal
          plaidItemId={reconsent.plaidItemId}
          onDismiss={() => setReconsent(null)}
        />
      )}
    </ChatContainer>
  );
}
