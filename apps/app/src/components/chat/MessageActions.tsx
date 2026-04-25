"use client";

import { useState } from "react";
import { Copy01 } from "@untitledui/icons";
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
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy"
        className="rounded p-1 hover:bg-secondary"
      >
        <Copy01 className="size-4 text-quaternary" />
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
      {copied && <span className="text-xs text-tertiary">Copied</span>}
    </div>
  );
}
