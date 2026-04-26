"use client";

interface MessageFailedStateProps {
  onRetry: () => void;
  isRetrying: boolean;
}

export function MessageFailedState({ onRetry, isRetrying }: MessageFailedStateProps) {
  return (
    <div className="mt-2 flex items-center gap-2 border-t border-error-primary pt-2 text-xs text-error-primary">
      <span>Message failed.</span>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="rounded border border-error-primary px-2 py-0.5 hover:bg-error-primary disabled:opacity-40"
      >
        {isRetrying ? "Retrying..." : "Retry"}
      </button>
    </div>
  );
}
