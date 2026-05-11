"use client";

import { useSmoothText } from "@convex-dev/agent/react";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { AssistantAvatar } from "@/components/chat/AssistantAvatar";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { MessageActions } from "@/components/chat/MessageActions";
import { MessageTimestamp } from "@/components/chat/MessageTimestamp";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { ToolResultRenderer } from "@/components/chat/tool-results/ToolResultRenderer";
import { RawTextMessage } from "@/components/chat/tool-results/shared/RawTextMessage";
import type { PartState, ToolName } from "@/components/chat/tool-results/types";
import { useMessageEditing } from "@/hooks/useMessageEditing";
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

  // CROWDEV-395 / CROWDEV-422: edit-and-resend state machine extracted to a
  // hook so this component stays under the size budget. Behavior unchanged
  // — see `src/hooks/useMessageEditing.ts` for full notes.
  const editing = useMessageEditing({ message });

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
          ref={isUser && editing.isEditing ? editing.editorRef : undefined}
          className={cx(
            // CROWDEV-411 (Bug A): `min-w-[8rem]` (128px) keeps very short
            // messages — "hi", "ok", "thanks" — from collapsing narrower than
            // the absolute-positioned `<MessageTimestamp>`. The timestamp's
            // worst case ("May 7, 3:29 PM" at `text-[10px]`) is ~80px wide and
            // sits at `right-1`/`left-1`; an 8rem bubble guarantees the
            // timestamp visually nests inside the bubble's horizontal bounds.
            // CROWDEV-426: skip the min-width while the assistant typing dots
            // are showing — three 8px dots inside a 128px pill read as "the
            // bubble is too long". The typing state has no timestamp tooltip
            // overlap risk (the bubble is empty and the timestamp only matters
            // once content is present), so the original CROWDEV-411 use case
            // is unaffected.
            "relative rounded-2xl px-5 py-3 text-sm",
            !showTypingDots && "min-w-[8rem]",
            isUser
              ? editing.isEditing
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
          {isUser && editing.isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                ref={editing.textareaRef}
                value={editing.draft}
                onChange={(e) => editing.setDraft(e.target.value)}
                onInput={editing.handleTextareaInput}
                onKeyDown={editing.handleKeyDown}
                aria-label="Edit message"
                rows={1}
                disabled={editing.submitting}
                className="resize-none bg-transparent text-sm text-primary placeholder:text-quaternary focus:outline-none disabled:opacity-60"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={editing.handleCancelEdit}
                  disabled={editing.submitting}
                  className="rounded-md px-3 py-1 text-xs font-medium text-tertiary hover:bg-secondary disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void editing.handleSubmitEdit()}
                  disabled={editing.submitting || !editing.draft.trim()}
                  className="rounded-md bg-brand-solid px-3 py-1 text-xs font-medium text-white shadow-sm transition-all duration-[var(--sp-motion-base)] hover:brightness-110 active:brightness-95 disabled:opacity-40"
                >
                  {editing.submitting ? "Sending…" : "Send"}
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
        {/*
          CROWDEV-395 / regression fix: the `isStreaming` gate here was
          previously a single flag for all roles, which silently blocked
          actions on user messages forever — `appendUserTurn` inserts user
          rows with `isStreaming: true` as a turn-in-flight marker and
          NOTHING flips it to false on a successful run (only `abortRun`
          and `finalizeUserTurnIfStranded` clear it, both for aborted /
          stranded turns). Result: every user bubble had no copy or edit
          affordance after the first reply landed — including the new
          Edit button shipped with this ticket. Differentiate by role:
            - User bubble: hide actions ONLY while inline-editing.
            - Assistant bubble: hide actions while the row is mid-stream
              (existing behaviour; row flag flips to false on `persistStep`).
        */}
        {!editing.isEditing && !(isAssistant && isStreaming) && (
          <MessageActions
            messageText={message.text ?? ""}
            role={isUser ? "user" : "assistant"}
            onRegenerate={isAssistant ? onRegenerate : undefined}
            onEdit={isUser ? editing.handleEditStart : undefined}
            className={isUser ? "mr-1" : "ml-1"}
          />
        )}
      </div>
    </div>
  );
}
