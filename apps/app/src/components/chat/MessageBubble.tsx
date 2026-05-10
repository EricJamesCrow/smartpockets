"use client";

import { useSmoothText } from "@convex-dev/agent/react";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { AssistantAvatar } from "@/components/chat/AssistantAvatar";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { MessageActions } from "@/components/chat/MessageActions";
import { MessageTimestamp } from "@/components/chat/MessageTimestamp";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { StreamingCursor } from "@/components/chat/StreamingCursor";
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
          className={cx(
            "relative rounded-2xl px-5 py-3 text-sm",
            isUser
              ? "rounded-tr-none bg-brand-solid text-white"
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
          {isUser ? (
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
            <>
              <MarkdownContent content={displayText} />
              {isStreaming && <StreamingCursor />}
            </>
          )}
        </div>
        {!isStreaming && (
          <MessageActions
            messageText={message.text ?? ""}
            role={isUser ? "user" : "assistant"}
            onRegenerate={isAssistant ? onRegenerate : undefined}
            className={isUser ? "mr-1" : "ml-1"}
          />
        )}
      </div>
    </div>
  );
}
