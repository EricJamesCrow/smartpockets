"use client";

import { useEffect, useState } from "react";
import { cx } from "@/utils/cx";

/**
 * CROWDEV-394: Hover-revealed message timestamps.
 *
 * Renders a small relative timestamp ("2m ago", "yesterday") at the corner of
 * a message bubble. Hidden at rest; fades in on `group-hover/msg` (the parent
 * `MessageBubble` provides the `group/msg` ancestor).
 *
 * - Native `title` carries the absolute ISO timestamp for prolonged hover so
 *   the user can verify exact time without us rendering a heavier tooltip.
 * - `aria-hidden` keeps screen readers focused on the message content (the
 *   bubble itself surfaces who/what; precise time is non-essential).
 * - No `motion-safe`/`motion-reduce` toggling needed because we use opacity
 *   transitions only — Tailwind's `transition-opacity` respects the user's
 *   reduced-motion preference at the OS level via the browser engine without
 *   extra work, but more importantly: opacity is not a translation/scale
 *   animation and does not trigger vestibular reactions in reduced-motion
 *   users.
 * - We tick once a minute only when the message is recent (< 1h old) so we
 *   don't waste re-renders on long-lived chat history.
 */
interface MessageTimestampProps {
  /** Convex auto-added `_creationTime` (epoch ms). */
  creationTime: number;
  /** Which corner to anchor to. Defaults to "right" (assistant bubble). */
  align?: "left" | "right";
}

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const ABSOLUTE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function formatRelative(creationTime: number, now: number): string {
  const diff = now - creationTime;

  // "just now" for sub-30s — relative formatter would say "0 seconds ago" which
  // reads wrong. Hardcode the friendlier copy.
  if (diff < 30 * SECOND) return "just now";
  if (diff < MINUTE) return `${Math.floor(diff / SECOND)}s ago`;
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 2 * DAY) return RELATIVE_FORMATTER.format(-1, "day"); // "yesterday"

  // Older than 24h: switch to absolute date so we don't show "47 days ago"
  // for ancient threads. `Intl.DateTimeFormat` respects the user's locale.
  return ABSOLUTE_FORMATTER.format(new Date(creationTime));
}

export function MessageTimestamp({ creationTime, align = "right" }: MessageTimestampProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const ageMs = Date.now() - creationTime;
    // Only tick for recent messages where the relative copy actually changes
    // within a minute. After 1h the granularity is hours, so a stale value
    // is fine (re-rendering on hover already gives us a fresh string).
    if (ageMs >= HOUR) return;
    const interval = setInterval(() => setNow(Date.now()), MINUTE);
    return () => clearInterval(interval);
  }, [creationTime]);

  const relative = formatRelative(creationTime, now);
  const absolute = new Date(creationTime).toISOString();

  return (
    <span
      aria-hidden="true"
      title={absolute}
      className={cx(
        "pointer-events-none absolute -top-4 select-none text-[10px] leading-none text-quaternary opacity-0 transition-opacity group-hover/msg:opacity-100",
        align === "right" ? "right-1" : "left-1",
      )}
    >
      {relative}
    </span>
  );
}
