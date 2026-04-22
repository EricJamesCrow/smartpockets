"use client";

import { AlertCircle } from "@untitledui/icons";

interface ToolErrorRowProps {
  toolName: string;
  errorText: string;
}

export function ToolErrorRow({ toolName, errorText }: ToolErrorRowProps) {
  return (
    <div className="my-2 flex items-start gap-2 rounded-lg border border-error-primary bg-error-primary px-3 py-2 text-sm text-error-primary">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">{toolName} failed</p>
        <p className="mt-1 text-xs opacity-80">{errorText}</p>
      </div>
    </div>
  );
}
