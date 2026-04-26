"use client";

import { AlertCircle } from "@untitledui/icons";

interface ToolErrorRowProps {
  toolName: string;
  errorText: string;
}

export function ToolErrorRow({ toolName, errorText }: ToolErrorRowProps) {
  return (
    <div className="my-2 flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">{toolName} failed</p>
        <p className="mt-1 text-xs text-error-600">{errorText}</p>
      </div>
    </div>
  );
}
