"use client";

import { cx } from "@/utils/cx";

/**
 * Markdown-light renderer used as:
 *  1. The fallback Component for tools without a registered render (e.g.
 *     `search_merchants`, `get_plaid_health` at MVP).
 *  2. Raw JSON dump for unregistered tools or fallback paths.
 *
 * Implementation note: a full `react-markdown` renderer is intentionally
 * deferred. W3 MVP renders agent text via the W1 `Markdown` component above
 * `ToolResultRenderer` (per spec §3.4), so this fallback only needs to present
 * legible text. Paragraphs split on blank lines; inline newlines preserved.
 */
export function RawTextMessage({ text, className }: { text: string; className?: string }) {
    const paragraphs = text.split(/\n{2,}/);
    return (
        <div className={cx("max-w-[640px] space-y-2 text-sm text-primary", className)}>
            {paragraphs.map((paragraph, i) => (
                <p key={i} className="whitespace-pre-wrap break-words">
                    {paragraph}
                </p>
            ))}
        </div>
    );
}
