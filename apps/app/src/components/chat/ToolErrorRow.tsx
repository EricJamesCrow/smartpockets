"use client";

import { AlertCircle, RefreshCcw01 } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";

interface ToolErrorRowProps {
  toolName: string;
  errorText: string;
  /**
   * Optional retry handler. When provided, renders a "Retry" button that
   * re-dispatches the failed tool call. The dispatcher (`ToolResultRenderer`)
   * is responsible for gating retry to read-only / idempotent tools - when
   * undefined, no button is shown. CROWDEV-393.
   */
  onRetry?: () => void;
}

export function ToolErrorRow({ toolName, errorText, onRetry }: ToolErrorRowProps) {
  return (
    <div className="my-2 flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-700 dark:bg-error-950 dark:text-error-200">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">{toolName} failed</p>
        <p className="mt-1 text-xs text-error-600 dark:text-error-300">{errorText}</p>
        {onRetry && (
          <div className="mt-2">
            <Button
              size="sm"
              color="tertiary"
              iconLeading={RefreshCcw01}
              onClick={onRetry}
            >
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
