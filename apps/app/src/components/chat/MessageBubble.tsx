"use client";

import { useSmoothText } from "@convex-dev/agent/react";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { MessageActions } from "@/components/chat/MessageActions";
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

  return (
    <div className={cx("group/msg relative flex gap-4", isUser && "flex-row-reverse")}>
      <div
        className={cx(
          "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          isUser
            ? "bg-brand-solid text-white"
            : "border border-secondary bg-secondary text-primary dark:border-[var(--sp-moss-line)] dark:bg-[var(--sp-surface-panel-strong)]",
        )}
        aria-hidden
      >
        {isUser ? "You" : <span className="font-[family-name:var(--font-fraunces)] italic">SP</span>}
      </div>
      <div className={cx("flex max-w-[80%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cx(
            "rounded-2xl px-5 py-3 text-sm",
            isUser
              ? "rounded-tr-none bg-brand-solid text-white"
              : "min-h-[42px] rounded-tl-none border border-secondary bg-secondary text-primary dark:border-[var(--sp-moss-line)] dark:bg-[var(--sp-surface-panel-strong)] dark:shadow-[var(--sp-inset-hairline)]",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{displayText}</p>
          ) : (
            <MarkdownContent content={displayText} />
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
