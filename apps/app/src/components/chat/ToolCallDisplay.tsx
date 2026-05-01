"use client";

// Visual idioms for state badges, awaiting-approval, error states inspired by
// assistant-ui's ToolHeader / ToolInput / ToolOutput components — read the
// source for layout patterns; we don't import the library (architectural
// mismatch with our React Aria-based UntitledUI Pro shell).

import { useState } from "react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy01,
  Settings01,
  XClose,
} from "@untitledui/icons";

interface ToolCallDisplayProps {
  toolName: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error"
    | "awaiting-approval";
  summary?: ReactNode | string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

function JsonView({ label, value }: { label: string; value: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — silently no-op.
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-tertiary">{label}</p>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-tertiary transition-colors hover:bg-secondary"
        >
          <Copy01 className="size-3" />
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="max-h-64 overflow-auto rounded bg-secondary p-2 font-[family-name:var(--font-geist-mono)] text-xs text-secondary">
        {text}
      </pre>
    </div>
  );
}

export function ToolCallDisplay({
  toolName,
  input,
  output,
  error,
  state,
  summary,
  icon,
}: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isComplete = state === "output-available";
  const hasError = state === "output-error" || Boolean(error);
  const isAwaitingApproval = state === "awaiting-approval";
  const isPending = !isComplete && !hasError && !isAwaitingApproval;

  const Icon = icon ?? Settings01;
  const contentId = `tool-${toolName}-content`;
  const headerSummary = isAwaitingApproval ? "awaiting your approval" : summary;

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-secondary bg-primary">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-secondary"
      >
        {isExpanded ? (
          <ChevronDown className="size-4 shrink-0 text-quaternary" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-quaternary" />
        )}
        <Icon className="size-4 shrink-0 text-tertiary" />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 font-medium text-secondary">
            {toolName.replace(/_/g, " ")}
          </span>
          {headerSummary && (
            <>
              <span className="shrink-0 text-quaternary">·</span>
              <span className="truncate text-tertiary">{headerSummary}</span>
            </>
          )}
        </div>
        <div className="ml-auto shrink-0">
          {isComplete && <Check className="size-4 text-success-secondary" />}
          {hasError && <XClose className="size-4 text-error-secondary" />}
          {isAwaitingApproval && (
            <AlertCircle className="size-4 text-warning-secondary" />
          )}
          {isPending && (
            <div className="size-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          )}
        </div>
      </button>
      {isExpanded && (
        <div
          id={contentId}
          className="space-y-2 border-t border-secondary px-3 pb-3 pt-2"
        >
          {input !== undefined && <JsonView label="Input" value={input} />}
          {output !== undefined && output !== null && (
            <JsonView label="Output" value={output} />
          )}
          {error && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-tertiary">Error</p>
              <p className="text-xs text-error-primary">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
