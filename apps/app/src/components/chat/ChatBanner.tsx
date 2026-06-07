"use client";

import Link from "next/link";
import { AlertCircle, Clock, XClose, Zap } from "@untitledui/icons";

export type ChatBannerState =
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "budget_exhausted"; reason?: string }
  | { kind: "run_in_progress" }
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
      case "budget_exhausted": {
        const text =
          state.reason === "message_cap"
            ? "You've used all your messages this month."
            : state.reason === "thread_cap"
              ? "This conversation is too long — start a new chat."
              : "You've reached this month's usage limit.";
        // thread_cap is plan-independent (a per-thread guard), so no upgrade CTA.
        const link =
          state.reason === "thread_cap"
            ? null
            : { href: "/settings/billing", label: "Upgrade to Pro" };
        return { icon: <AlertCircle className="size-4" />, text, link };
      }
      case "run_in_progress":
        return {
          icon: <Clock className="size-4" />,
          text: "Assistant is still responding.",
          link: null,
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
        className="ml-auto rounded p-1 hover:bg-warning-600/10 focus-visible:bg-warning-600/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-warning-600/40 dark:hover:bg-warning-400/20 dark:focus-visible:bg-warning-400/20 dark:focus-visible:ring-warning-400/40"
      >
        <XClose className="size-4" />
      </button>
    </div>
  );
}
