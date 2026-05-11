"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Doc } from "@convex/_generated/dataModel";
import { useChatInteraction } from "@/components/chat/ChatInteractionContext";

type AgentMessage = Doc<"agentMessages">;

// Cap textarea growth so a long edit doesn't overflow the bubble in the
// surrounding scroll container. Past this height we scroll inside the
// textarea instead of growing the bubble vertically.
const TEXTAREA_MAX_HEIGHT_PX = 320;

/**
 * CROWDEV-395: inline edit-and-resend state machine for a user message bubble.
 *
 * Originally inlined in `MessageBubble.tsx`; extracted here per AGENTS.md's
 * "page components <100 lines, hooks in `src/hooks/`" rule (CROWDEV-422).
 * Behavior is exactly preserved — IME guard, Cmd/Ctrl+Enter and Enter submit,
 * Esc cancels, click-outside cancels via `mousedown` (not `click`) to fire
 * before any focus shift inside the bubble can re-trigger it. The original
 * `message.text` stays the source of truth on cancel so no React-state churn
 * can lose user data.
 *
 * Wire `editorRef` to the bubble's outer container (used for click-outside
 * detection) and `textareaRef` to the inline `<textarea>` (used for autofocus,
 * caret placement, and auto-resize).
 */
export function useMessageEditing(params: { message: AgentMessage }) {
  const { message } = params;
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

  // Auto-focus + caret-to-end + initial resize on edit entry.
  useEffect(() => {
    if (!isEditing) return;
    const node = textareaRef.current;
    if (!node) return;
    node.focus();
    const len = node.value.length;
    node.setSelectionRange(len, len);
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
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
    // NOTE: Don't guard on `isStreaming` here. For user messages, the
    // row-level `isStreaming` flag is a turn-in-flight marker that's
    // inserted as `true` by `appendUserTurn` and STAYS `true` after the
    // assistant replies (only `abortRun` and `finalizeUserTurnIfStranded`
    // flip it, both of which only fire on aborted/stranded runs). Guarding
    // on it here would mean Edit-on-user is permanently disabled after the
    // first turn completes. The submit handler already throws on
    // backend-side conflicts (budget cap, viewer mismatch).
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
      console.error("[useMessageEditing] editAndResend failed", err);
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
    node.style.height = `${Math.min(node.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
  };

  return {
    isEditing,
    draft,
    setDraft,
    submitting,
    editorRef,
    textareaRef,
    handleEditStart,
    handleCancelEdit,
    handleSubmitEdit,
    handleKeyDown,
    handleTextareaInput,
  };
}
