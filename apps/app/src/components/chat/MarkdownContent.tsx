"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";

interface MarkdownContentProps {
    content: string;
}

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

let streamdownPromise: Promise<ComponentType<{ children: string }>> | null = null;

function loadStreamdown(): Promise<ComponentType<{ children: string }>> {
    streamdownPromise ??= import("streamdown").then(
        (mod) => mod.Streamdown as ComponentType<{ children: string }>,
    );
    return streamdownPromise;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
    const [Streamdown, setStreamdown] = useState<ComponentType<{ children: string }> | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadStreamdown().then((Component) => {
            if (!cancelled) setStreamdown(() => Component);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    if (!Streamdown) {
        return <p className="whitespace-pre-wrap">{content}</p>;
    }
    return <Streamdown>{content}</Streamdown>;
}
