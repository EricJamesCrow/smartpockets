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
import { ChatSendErrorChip } from "@/components/chat/ChatSendErrorChip";
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
 * to swap into the bouncing-dots affordance, so we set both. CROWDEV-343:
 * this restores the parallel "user bubble + thinking dots" UX that was
 * dropped when PR #156 unified the optimistic render path. Dedup logic in
 * MessageList drops this row once a real assistant message arrives ordered
 * after the latest user turn.
 *
 * `idSuffix` makes the React key stable across renders while a single
 * indicator session is active. Without that stability React would unmount
 * and remount the bubble each time `messages` changes (CROWDEV-363). See
 * `indicatorSuffix` in `ChatViewBody` for the derivation.
 */
function buildOptimisticAssistantMessage(
  threadId: Id<"agentThreads"> | null,
  idSuffix: string,
): AgentMessage {
  const now = Date.now();
  return {
    _id: `optimistic_assistant_${idSuffix}` as Id<"agentMessages">,
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
  // CROWDEV-393 (follow-up): inline recovery for HTTP-level send failures.
  // `ToolErrorRow` only surfaces server-side tool-execution errors that are
  // persisted into `agentMessages` as tool-role rows. Anything that fails
  // *before* the agent runtime gets to run — offline, DNS, 5xx — short-circuits
  // in `defaultSendMessage` and never produces a tool row. Without this chip
  // the chat input just sits silent and the user can only retype.
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
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

  // CROWDEV-363: the typing indicator must show on EVERY turn — not only the
  // first send. PR #168's original derivation was gated solely on
  // `pendingPrompt`, which `MessageList` clears via `onMessagesLoaded` the
  // moment the real user row matches by text. On the first send the thread
  // doesn't exist yet, so the gap between pendingPrompt-clear and the real
  // assistant streaming row is masked by the URL change + remount. On
  // follow-ups the user row lands almost immediately, `pendingPrompt`
  // clears, and the dots vanish for the multi-second window before the
  // assistant starts streaming.
  //
  // Fix: show the indicator when ANY of these hold:
  //   1. We have a pending prompt and the real user row hasn't yet caught
  //      up — covers both the first-send window (no `messages` yet) and the
  //      brief follow-up window between fetch and query refresh.
  //   2. The same `isStreaming` signal the stop button uses
  //      (lastUser.isStreaming === true && no assistant ordered after it).
  //      This is the steady-state condition that bridges from the moment
  //      the new user row lands to the moment the first assistant token
  //      starts streaming.
  //
  // Once a real streaming assistant row lands creation-time-after the user
  // row, both conditions flip false and the synthesized bubble disappears.
  // The real streaming row continues to render bouncing dots in
  // `MessageBubble` (it uses `isStreaming && !text` per-bubble), so the
  // visual transitions seamlessly.
  const pendingPromptInFlight = useMemo(() => {
    if (!pendingPrompt) return false;
    if (!messages) return true;
    const trimmed = pendingPrompt.trim();
    if (!trimmed) return false;
    return !messages.some((m) => m.role === "user" && m.text?.trim() === trimmed);
  }, [pendingPrompt, messages]);

  const showAssistantTypingIndicator = pendingPromptInFlight || isStreaming;

  // Stable React key for the synthesized bubble across an indicator session.
  // The synthesized bubble's key must NOT change between renders of the same
  // turn — `MessageList` updates whenever the `messages` query refreshes (any
  // field on any row), and a key change would unmount/remount the bubble,
  // killing the bounce animation and producing a visible flicker. The
  // indicator naturally appears + disappears around each turn boundary
  // (between turns `showAssistantTypingIndicator` is false, so the bubble
  // unmounts), so a per-thread-stable id is sufficient — the same key is
  // safely reused across turns because there's always a render gap of "no
  // bubble" in between. For the very first send (no threadId yet), key on
  // a per-prompt placeholder so we don't collide with neighbouring threads
  // in the same React tree.
  const indicatorSuffix = threadId ?? `new_${pendingPrompt ?? "idle"}`;

  const optimisticAssistantMessage = useMemo<AgentMessage | null>(() => {
    if (!showAssistantTypingIndicator) return null;
    return buildOptimisticAssistantMessage(threadId, indicatorSuffix);
  }, [showAssistantTypingIndicator, threadId, indicatorSuffix]);

  // Returns true if the error mapped to a typed surface (banner / modal /
  // info-log). Returns false for unmapped failures so the caller can stash the
  // prompt for the inline retry chip. CROWDEV-393 (follow-up).
  const routeError = (err: unknown): boolean => {
    const typed = translateError(err);
    if (!typed) {
      console.error("[ChatView] unexpected error", err);
      return false;
    }
    switch (typed.kind) {
      case "rate_limited":
      case "budget_exhausted":
      case "llm_down":
        setBanner(typed);
        return true;
      case "reconsent_required":
        setReconsent({ plaidItemId: typed.plaidItemId });
        return true;
      case "first_turn_guard":
      case "proposal_timed_out":
      case "proposal_invalid_state":
        console.info("[ChatView]", typed.kind);
        return true;
    }
  };

  const handleSend = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setPendingPrompt(trimmed);
    setBanner(null);
    // Clear any previous retry chip — a fresh send supersedes it.
    setLastFailedMessage(null);
    try {
      await sendMessage({ text: trimmed });
    } catch (err) {
      const handled = routeError(err);
      setPendingPrompt(null);
      if (!handled) {
        // HTTP-level / transport failure: store the prompt so the user can
        // re-send it via the inline chip without retyping. Typed errors
        // already have their own surfaces and don't need this affordance.
        setLastFailedMessage(trimmed);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryFailedSend = useCallback(async () => {
    if (!lastFailedMessage || isRetrying) return;
    setIsRetrying(true);
    setPendingPrompt(lastFailedMessage);
    setBanner(null);
    try {
      await sendMessage({ text: lastFailedMessage });
      // Success: clear chip + pending state (the live messages query will
      // catch up via the user-row landing).
      setLastFailedMessage(null);
    } catch (err) {
      const handled = routeError(err);
      setPendingPrompt(null);
      if (handled) {
        // Typed error took over (e.g. rate-limited banner). Clear the chip so
        // we don't double-surface the failure.
        setLastFailedMessage(null);
      }
      // If unhandled, keep `lastFailedMessage` so the chip stays mounted.
    } finally {
      setIsRetrying(false);
    }
  }, [lastFailedMessage, isRetrying, sendMessage]);

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
      {lastFailedMessage && (
        <div className="px-4 md:px-8">
          <ChatSendErrorChip
            onRetry={handleRetryFailedSend}
            onDismiss={() => setLastFailedMessage(null)}
            isRetrying={isRetrying}
          />
        </div>
      )}
      <MessageInput
        onSend={handleSend}
        onStop={handleStop}
        isLoading={isLoading || isRetrying}
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
