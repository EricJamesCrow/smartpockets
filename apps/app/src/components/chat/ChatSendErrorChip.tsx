"use client";

import { AlertCircle, RefreshCcw01, XClose } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";

interface ChatSendErrorChipProps {
  /**
   * Optional descriptor of what failed (e.g. "Failed to send"). Defaults to a
   * generic copy that fits transient network failures and 5xx alike.
   */
  message?: string;
  onRetry: () => void;
  onDismiss: () => void;
  isRetrying?: boolean;
}

/**
 * Inline recovery chip for HTTP-level chat send failures. CROWDEV-393.
 *
 * The send-message HTTP fetch in `ChatInteractionContext.defaultSendMessage`
 * fails BEFORE the agent runtime gets a chance to persist a tool-role row, so
 * those errors never reach `ToolErrorRow` (which only renders for server-side
 * tool-execution errors). This chip surfaces above the message input so the
 * user can re-send the same text after reconnecting or after the backend
 * recovers, without having to retype the prompt.
 *
 * Sibling, not a banner: `ChatBanner` is reserved for backend-typed errors
 * (rate_limited / budget_exhausted / llm_down) that the user can't fix
 * client-side. This chip handles the "transient transport blip" path where
 * a retry is genuinely productive.
 */
export function ChatSendErrorChip({
  message,
  onRetry,
  onDismiss,
  isRetrying = false,
}: ChatSendErrorChipProps) {
  return (
    <div
      role="alert"
      className="mx-auto mb-2 flex w-full max-w-4xl items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-700 dark:bg-error-950 dark:text-error-200"
    >
      <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{message ?? "Failed to send"}</span>
      <Button
        size="sm"
        color="tertiary"
        iconLeading={RefreshCcw01}
        onClick={onRetry}
        isDisabled={isRetrying}
        aria-label="Retry sending message"
      >
        {isRetrying ? "Retrying..." : "Retry"}
      </Button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="ml-1 rounded p-1 hover:bg-error-100 focus-visible:bg-error-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-error-600/40 dark:hover:bg-error-900 dark:focus-visible:bg-error-900 dark:focus-visible:ring-error-400/40"
      >
        <XClose className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
