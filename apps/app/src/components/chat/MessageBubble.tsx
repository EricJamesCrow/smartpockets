"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useSmoothText } from "@convex-dev/agent/react";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { AssistantAvatar } from "@/components/chat/AssistantAvatar";
import { useChatInteraction } from "@/components/chat/ChatInteractionContext";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { MessageActions } from "@/components/chat/MessageActions";
import { MessageTimestamp } from "@/components/chat/MessageTimestamp";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { ToolResultRenderer } from "@/components/chat/tool-results/ToolResultRenderer";
import { RawTextMessage } from "@/components/chat/tool-results/shared/RawTextMessage";
import type { PartState, ToolName } from "@/components/chat/tool-results/types";
import { cx } from "@/utils/cx";

type AgentMessage = Doc<"agentMessages">;

interface MessageBubbleProps {
  message: AgentMessage;
  threadId: Id<"agentThreads">;
  onRegenerate?: () => Promise<void> | void;
}

function tryParseJson(raw: string | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapToolEnvelope(parsed: Record<string, unknown> | null): unknown {
  if (!parsed) return null;
  if (parsed.ok === true) return "data" in parsed ? parsed.data : null;
  return parsed;
}

function deriveToolErrorText(parsed: Record<string, unknown> | null): string | undefined {
  if (!parsed) return undefined;
  if (parsed.ok === false) {
    const error = parsed.error;
    if (isRecord(error) && typeof error.message === "string") return error.message;
    return "Tool failed";
  }
  const payload = parsed.ok === true && isRecord(parsed.data) ? parsed.data : parsed;
  if (payload.state === "failed") {
    return typeof payload.error === "string" ? payload.error : "Tool failed";
  }
  if (
    parsed.ok !== true &&
    typeof parsed.error === "string" &&
    (typeof parsed.code === "string" || typeof parsed.retryable === "boolean")
  ) {
    return parsed.error;
  }
  return undefined;
}

function deriveToolState(message: AgentMessage): PartState {
  const parsed = tryParseJson(message.toolResultJson);
  if (deriveToolErrorText(parsed)) return "output-error";
  if (message.toolResultJson) return "output-available";
  if (message.toolCallsJson) return "input-available";
  return "input-streaming";
}

export function MessageBubble({ message, threadId, onRegenerate }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isTool = message.role === "tool";
  const isSystem = message.role === "system";
  const isStreaming = message.isStreaming;

  const [smoothText] = useSmoothText(message.text ?? "", { startStreaming: isStreaming });
  const displayText = isUser || isSystem ? message.text ?? "" : smoothText;

  // CROWDEV-395: inline edit-and-resend on user messages.
  //   - `isEditing` toggles the bubble between display markup and an inline
  //     textarea pre-filled with the original text.
  //   - The original `message.text` is the source of truth on cancel — we
  //     never mutate it locally on Esc/click-outside, so cancel can't lose
  //     data even if React state has churned. On submit, the backend
  //     mutation patches the row's `text` and re-renders flow naturally.
  const chatInteraction = useChatInteraction();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.text ?? "");
  const [submitting, setSubmitting] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Keep the draft in sync with the source-of-truth `message.text` whenever
  // the bubble is NOT editing. This handles two cases:
  //   1. The reactive query updates the row's text (e.g. after a successful
  //      edit submit, the patched text flows back through `messages`).
  //   2. The user closes the editor and a parent re-renders.
  useEffect(() => {
    if (!isEditing) setDraft(message.text ?? "");
  }, [message.text, isEditing]);

  // Auto-focus + caret-to-end on edit entry.
  useEffect(() => {
    if (!isEditing) return;
    const node = textareaRef.current;
    if (!node) return;
    node.focus();
    const len = node.value.length;
    node.setSelectionRange(len, len);
    // Resize the textarea to fit current content.
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 320)}px`;
  }, [isEditing]);

  // Click-outside cancels editing. Mouse-down is used (not click) so the
  // cancel fires before any focus shift inside the bubble itself can
  // accidentally re-trigger it. Restoring `draft` from `message.text` on
  // exit guarantees the original content is preserved on cancel.
  useEffect(() => {
    if (!isEditing) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!editorRef.current) return;
      if (editorRef.current.contains(event.target as Node)) return;
      setIsEditing(false);
      setDraft(message.text ?? "");
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [isEditing, message.text]);

  const handleEditStart = () => {
    if (isStreaming) return;
    setDraft(message.text ?? "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setDraft(message.text ?? "");
  };

  const handleSubmitEdit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed === (message.text ?? "").trim()) {
      // No-op: same text. Just close the editor.
      setIsEditing(false);
      return;
    }
    setSubmitting(true);
    try {
      await chatInteraction.editAndResend({
        messageId: message._id,
        newText: trimmed,
      });
      setIsEditing(false);
    } catch (err) {
      // Surface to console; ChatView's error boundary covers fatal cases. We
      // intentionally don't swallow — leaving the editor open lets the user
      // retry or copy the text out.
      console.error("[MessageBubble] editAndResend failed", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // IME composition guard.
    if (event.nativeEvent.isComposing) return;

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void handleSubmitEdit();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmitEdit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancelEdit();
      return;
    }
  };

  const handleTextareaInput = () => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 320)}px`;
  };

  if (isTool) {
    const parsedInput = tryParseJson(message.toolCallsJson);
    const parsedOutput = tryParseJson(message.toolResultJson);
    if (!message.toolName && !parsedOutput && message.text) {
      return <RawTextMessage text={message.text} />;
    }
    const errorText = deriveToolErrorText(parsedOutput);
    return (
      <ToolResultRenderer
        toolName={(message.toolName ?? "unknown") as ToolName}
        input={parsedInput ?? {}}
        output={unwrapToolEnvelope(parsedOutput)}
        state={deriveToolState(message)}
        errorText={errorText}
        proposalId={message.proposalId}
        threadId={threadId}
      />
    );
  }

  if (isSystem) {
    return (
      <div
        role="status"
        className="rounded-md border border-secondary bg-secondary px-4 py-2 text-sm text-tertiary"
      >
        {displayText}
      </div>
    );
  }

  // CROWDEV-343 (FIX 7): the assistant typing indicator. While `isStreaming`
  // is true and no text has arrived yet, swap the markdown body for three
  // bouncing dots. Same bubble shell + same min-height so the layout doesn't
  // shift when the first token lands. Pattern (3 dots, animation-delay
  // staggered) mirrors UntitledUI's Messaging `typing` state to stay
  // consistent with the design system.
  const showTypingDots = isAssistant && isStreaming && (!displayText || displayText === "");

  // CROWDEV-390: VoiceOver smoke. Wrap each turn in an `article` landmark
  // with a role-specific `aria-label` so screen-reader users hear "Message
  // from you" / "Message from agent" when navigating between turns. Without
  // this the bubble is just a stack of <div>s and the speaker is implicit
  // only in visual layout.
  const turnLabel = isUser ? "Message from you" : "Message from agent";

  return (
    <div
      className={cx("group/msg relative flex gap-4", isUser && "flex-row-reverse")}
      role="article"
      aria-label={turnLabel}
    >
      {isUser ? <UserAvatar /> : <AssistantAvatar />}
      <div className={cx("flex max-w-[80%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div
          ref={isUser && isEditing ? editorRef : undefined}
          className={cx(
            "relative rounded-2xl px-5 py-3 text-sm",
            isUser
              ? isEditing
                ? "rounded-tr-none w-full border border-[var(--sp-moss-mint)]/40 bg-primary text-primary shadow-md dark:bg-[var(--sp-surface-panel-strong)]"
                : "rounded-tr-none bg-brand-solid text-white"
              : "min-h-[42px] rounded-tl-none border border-secondary bg-secondary text-primary dark:border-[var(--sp-moss-line)] dark:bg-[var(--sp-surface-panel-strong)] dark:shadow-[var(--sp-inset-hairline)]",
          )}
        >
          {/*
            CROWDEV-394: Hover-revealed timestamp at the bubble corner.
            Anchored opposite the avatar (top-right for assistant, top-left
            for user). Hidden at rest; fades in via the `group/msg` ancestor.
          */}
          <MessageTimestamp
            creationTime={message._creationTime}
            align={isUser ? "left" : "right"}
          />
          {isUser && isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onInput={handleTextareaInput}
                onKeyDown={handleKeyDown}
                aria-label="Edit message"
                rows={1}
                disabled={submitting}
                className="resize-none bg-transparent text-sm text-primary placeholder:text-quaternary focus:outline-none disabled:opacity-60"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={submitting}
                  className="rounded-md px-3 py-1 text-xs font-medium text-tertiary hover:bg-secondary disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmitEdit()}
                  disabled={submitting || !draft.trim()}
                  className="rounded-md bg-brand-solid px-3 py-1 text-xs font-medium text-white shadow-sm transition-all duration-[var(--sp-motion-base)] hover:brightness-110 active:brightness-95 disabled:opacity-40"
                >
                  {submitting ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          ) : isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{displayText}</p>
          ) : showTypingDots ? (
            <span
              className="inline-flex items-center gap-1"
              role="status"
              aria-label="Assistant is thinking"
            >
              <span className="size-2 animate-bounce rounded-full bg-tertiary [animation-delay:-0.3s]" />
              <span className="size-2 animate-bounce rounded-full bg-tertiary [animation-delay:-0.15s]" />
              <span className="size-2 animate-bounce rounded-full bg-tertiary" />
            </span>
          ) : (
            // CROWDEV-391 — the streaming cursor is injected as an inline
            // trailer of the last visible character via a Streamdown
            // rehype plugin (see `MarkdownContent` + `globals.css`'s
            // `sp-stream-cursor` rules). Previously it rendered as a
            // sibling AFTER `MarkdownContent`, which Streamdown's block
            // layout pushed onto a new line.
            <MarkdownContent content={displayText} isStreaming={isStreaming} />
          )}
        </div>
        {!isStreaming && !isEditing && (
          <MessageActions
            messageText={message.text ?? ""}
            role={isUser ? "user" : "assistant"}
            onRegenerate={isAssistant ? onRegenerate : undefined}
            onEdit={isUser ? handleEditStart : undefined}
            className={isUser ? "mr-1" : "ml-1"}
          />
        )}
      </div>
    </div>
  );
}
