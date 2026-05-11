"use client";

import { useEffect, useState } from "react";
import { Focusable } from "react-aria-components";
import { Tooltip } from "@repo/ui/untitledui/base/tooltip/tooltip";
import { cx } from "@/utils/cx";

/**
 * CROWDEV-394: Hover-revealed message timestamps.
 *
 * Renders a small relative timestamp ("2m ago", "yesterday") at the corner of
 * a message bubble. Hidden at rest; fades in on `group-hover/msg` (the parent
 * `MessageBubble` provides the `group/msg` ancestor) and on
 * `group-focus-within/msg` (when a keyboard user tabs through the bubble).
 *
 * - The absolute ISO timestamp is exposed via a react-aria-components
 *   `Tooltip` (CROWDEV-411). The previous native `title="<ISO>"` attribute
 *   was unreachable: hovering off the bubble hid the timestamp before the
 *   browser's native title-show delay could fire, so users never actually
 *   saw the precise time. The aria tooltip stays open as long as the user
 *   hovers/focuses the timestamp itself, independent of the parent group.
 * - The span is wrapped in `Focusable` and exposes `tabIndex=0` so keyboard
 *   users can Tab to the timestamp; `focus-visible:opacity-100` reveals it
 *   when focused even outside the parent group-hover.
 * - `aria-label` provides screen-reader copy ("Sent on May 7, 2026, 3:29 PM")
 *   while the visible text remains the friendly relative form. We removed
 *   the previous `aria-hidden` to make the timestamp navigable by keyboard
 *   users — the SR copy uses a localized full date+time, not the raw ISO.
 * - No `motion-safe`/`motion-reduce` toggling needed because we use opacity
 *   transitions only — they don't trigger vestibular reactions in
 *   reduced-motion users.
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
const FULL_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  year: "numeric",
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

  const date = new Date(creationTime);
  const relative = formatRelative(creationTime, now);
  const fullLocale = FULL_FORMATTER.format(date);
  const iso = date.toISOString();

  // CROWDEV-411 (Bug B): wrap the timestamp in a sustained tooltip so the
  // precise ISO time is reachable on hover/focus and stays visible long
  // enough to actually read. Anchored to "top" so it never collides with
  // the message body below.
  //
  // Tooltip placement flips to match the timestamp's alignment so the
  // tooltip body always grows toward the bubble centre rather than off the
  // screen edge.
  const tooltipPlacement = align === "right" ? "top end" : "top start";

  return (
    <Tooltip title={fullLocale} description={iso} placement={tooltipPlacement} delay={300}>
      <Focusable>
        <span
          tabIndex={0}
          aria-label={`Sent on ${fullLocale}`}
          className={cx(
            // `opacity-0` at rest; revealed by the parent group's hover or
            // any descendant focus. Once focused directly, the span stays
            // visible regardless of cursor position — keyboard users get the
            // same affordance as mouse users without trapping them.
            "absolute -top-4 select-none rounded-sm text-[10px] leading-none text-quaternary opacity-0 outline-none transition-opacity",
            "group-hover/msg:opacity-100 group-focus-within/msg:opacity-100 focus-visible:opacity-100",
            "focus-visible:ring-1 focus-visible:ring-quaternary",
            align === "right" ? "right-1" : "left-1",
          )}
        >
          {relative}
        </span>
      </Focusable>
    </Tooltip>
  );
}
