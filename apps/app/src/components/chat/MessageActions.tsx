"use client";

import { useState } from "react";
import { Check, Copy01 } from "@untitledui/icons";
import { cx } from "@/utils/cx";

interface MessageActionsProps {
  messageText: string;
  role: "user" | "assistant";
  onRegenerate?: () => Promise<void> | void;
  className?: string;
}

export function MessageActions({ messageText, role, onRegenerate, className }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={cx(
        "flex items-center gap-1 opacity-0 transition-opacity group-hover/msg:opacity-100",
        className,
      )}
    >
      {/*
        CROWDEV-364: Swap copy icon → checkmark on success instead of showing
        a "Copied" text label. `aria-label` flips to "Copied" and the button is
        wrapped in an aria-live region so assistive tech still hears the state
        change after the visual text label was removed.
      */}
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy"}
        aria-live="polite"
        className="rounded p-1 hover:bg-secondary"
      >
        {copied ? (
          <Check className="size-4 text-success-secondary" />
        ) : (
          <Copy01 className="size-4 text-quaternary" />
        )}
      </button>
      {role === "assistant" && onRegenerate && (
        <button
          type="button"
          onClick={() => void onRegenerate()}
          className="rounded px-2 py-1 text-xs text-tertiary hover:bg-secondary"
        >
          Retry
        </button>
      )}
    </div>
  );
}
