"use client";

import Link from "next/link";
import { AlertCircle, Clock, XClose, Zap } from "@untitledui/icons";

export type ChatBannerState =
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "budget_exhausted"; reason?: string }
  | { kind: "llm_down" };

interface ChatBannerProps {
  state: ChatBannerState;
  onDismiss: () => void;
}

export function ChatBanner({ state, onDismiss }: ChatBannerProps) {
  const content = (() => {
    switch (state.kind) {
      case "rate_limited":
        return {
          icon: <Clock className="size-4" />,
          text: `Slow down. Retry in ${state.retryAfterSeconds}s.`,
          link: null,
        };
      case "budget_exhausted":
        return {
          icon: <AlertCircle className="size-4" />,
          text: state.reason ?? "Monthly budget reached.",
          link: { href: "/settings/billing", label: "Upgrade in Settings" },
        };
      case "llm_down":
        return {
          icon: <Zap className="size-4" />,
          text: "Assistant is offline. Retrying...",
          link: null,
        };
    }
  })();

  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-warning-secondary bg-warning-secondary px-4 py-2 text-sm text-warning-primary"
    >
      {content.icon}
      <span>{content.text}</span>
      {content.link && (
        <Link href={content.link.href} className="ml-2 underline">
          {content.link.label}
        </Link>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="ml-auto rounded p-1 hover:bg-warning-primary/10 dark:hover:bg-warning-primary/20"
      >
        <XClose className="size-4" />
      </button>
    </div>
  );
}
