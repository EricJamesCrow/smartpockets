"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Settings01,
  Check,
  XClose,
} from "@untitledui/icons";

interface ToolCallDisplayProps {
  toolName: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
}

export function ToolCallDisplay({ toolName, input, output, error, state }: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isComplete = state === "output-available";
  const hasError = state === "output-error" || Boolean(error);
  const isPending = !isComplete && !hasError;

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-secondary bg-primary">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-secondary"
      >
        {isExpanded ? (
          <ChevronDown className="size-4 text-quaternary" />
        ) : (
          <ChevronRight className="size-4 text-quaternary" />
        )}
        <Settings01 className="size-4 text-tertiary" />
        <span className="font-medium text-secondary">{toolName}</span>
        <div className="ml-auto">
          {isComplete && <Check className="size-4 text-success-secondary" />}
          {hasError && <XClose className="size-4 text-error-secondary" />}
          {isPending && (
            <div className="size-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="space-y-2 border-t border-secondary px-3 pb-3">
          {input !== undefined && (
            <div className="pt-2">
              <p className="mb-1 text-xs font-medium text-tertiary">Input</p>
              <pre className="overflow-x-auto rounded bg-secondary p-2 text-xs text-secondary">
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {output !== undefined && output !== null && (
            <div>
              <p className="mb-1 text-xs font-medium text-tertiary">Output</p>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-secondary p-2 text-xs text-secondary">
                {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
          {error && (
            <div>
              <p className="mb-1 text-xs font-medium text-tertiary">Error</p>
              <p className="text-xs text-error-primary">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
