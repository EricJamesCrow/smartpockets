"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { streamdownCursorPlugin } from "@/components/chat/streamdown-cursor-plugin";
import { streamdownStripTablesPlugin } from "@/components/chat/streamdown-strip-tables-plugin";

interface MarkdownContentProps {
    content: string;
    /**
     * When `true`, the rendered markdown receives an inline streaming
     * cursor (a pulsing span) trailing the last visible character. The
     * cursor is appended to the deepest leaf text-bearing element of
     * the LAST Streamdown block via a rehype plugin and is hidden via
     * CSS on every non-final block (CROWDEV-391).
     */
    isStreaming?: boolean;
    /**
     * When `true`, any markdown `<table>` blocks are removed from the
     * rendered HAST tree (CROWDEV-425). The chat surface renders tabular
     * data exclusively through tool-result widgets, so any table the
     * model emits in its prose is a duplicate — this strip is the
     * deterministic backstop behind system-prompt rule 11. Defaults to
     * `true` because every consumer in the chat surface wants this; opt
     * out if a future surface legitimately wants raw markdown tables.
     */
    stripTables?: boolean;
}

type StreamdownProps = {
    children: string;
    rehypePlugins?: unknown;
    className?: string;
    mode?: "static" | "streaming";
};

type StreamdownExports = {
    Streamdown: ComponentType<StreamdownProps>;
    defaultRehypePlugins: Record<string, unknown>;
};

/*
 * Streamdown is loaded lazily to keep the ~131KB gzipped chunk (shiki +
 * markdown engine + lazy mermaid/katex) out of the chat-route initial
 * bundle. We do the lazy load by hand rather than via `next/dynamic` so we
 * can render a content-bearing fallback while the chunk downloads —
 * `next/dynamic`'s `loading` prop renders a placeholder that doesn't see
 * `content`, so cached-miss / slow-network thread loads would show empty
 * assistant bubbles for hundreds of milliseconds (CROWDEV-343, PR #159
 * codex P2). The plain-text fallback uses `whitespace-pre-wrap` so line
 * breaks survive; markdown formatting lights up once Streamdown mounts.
 *
 * SSR is implicitly disabled because this is a "use client" boundary and
 * the import is gated on `useEffect`. Streamdown's bundled code-block
 * highlighting uses browser-only APIs and we already swap into this
 * client-only renderer at the bubble level.
 *
 * See CROWDEV-329 PR 5 — without this lazy split, the chat-route delta is
 * +74KB gzipped over react-markdown, exceeding the +60KB gate.
 */

let streamdownPromise: Promise<StreamdownExports> | null = null;

function loadStreamdown(): Promise<StreamdownExports> {
    streamdownPromise ??= import("streamdown").then((mod) => ({
        Streamdown: mod.Streamdown as ComponentType<StreamdownProps>,
        defaultRehypePlugins: mod.defaultRehypePlugins as Record<string, unknown>,
    }));
    return streamdownPromise;
}

export function MarkdownContent({
    content,
    isStreaming = false,
    stripTables = true,
}: MarkdownContentProps) {
    const [streamdown, setStreamdown] = useState<StreamdownExports | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadStreamdown().then((exports_) => {
            if (!cancelled) setStreamdown(exports_);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    /*
     * Re-create the rehype plugin tuple whenever `isStreaming` flips so
     * the cursor marker is injected on streaming-active renders and
     * dropped on the resolve render. The plugin reads `active` from its
     * options closure; the boolean is captured at render-time, so each
     * tuple identity changes when the flag changes — that triggers
     * Streamdown's plugin-list memo to rerun without thrashing on
     * stable-state renders.
     */
    const rehypePlugins = useMemo(() => {
        if (!streamdown) return undefined;
        const defaults = Object.values(streamdown.defaultRehypePlugins);
        return [
            ...defaults,
            // Run the strip-tables plugin BEFORE the cursor plugin so the
            // streaming cursor never lands inside a `<table>` that is about
            // to be removed (cursor would vanish with the table).
            [streamdownStripTablesPlugin, { active: stripTables }],
            [streamdownCursorPlugin, { active: isStreaming }],
        ];
    }, [streamdown, isStreaming, stripTables]);

    if (!streamdown) {
        return <p className="whitespace-pre-wrap">{content}</p>;
    }

    const { Streamdown } = streamdown;
    return (
        <Streamdown
            className={isStreaming ? "sp-stream-host" : undefined}
            rehypePlugins={rehypePlugins}
        >
            {content}
        </Streamdown>
    );
}
