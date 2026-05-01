"use client";

import dynamic from "next/dynamic";

/*
 * Streamdown is dynamically imported to keep the ~131KB gzipped chunk
 * (shiki + markdown engine + lazy mermaid/katex) out of the chat-route
 * initial bundle. The fallback is null — good enough for the brief moment
 * between first message paint and the streamdown chunk landing. SSR is
 * disabled because streamdown's bundled code-block highlighting uses
 * browser-only APIs and we already swap into this client-only renderer.
 *
 * See CROWDEV-329 PR 5 — without dynamic, the chat-route delta is +74KB
 * gzipped over react-markdown, exceeding the +60KB gate.
 */
const Streamdown = dynamic(
    () => import("streamdown").then((mod) => ({ default: mod.Streamdown })),
    {
        ssr: false,
        loading: () => null,
    },
);

interface MarkdownContentProps {
    content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
    return <Streamdown>{content}</Streamdown>;
}
