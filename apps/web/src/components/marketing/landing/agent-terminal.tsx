"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { cx } from "@repo/ui/utils";

type Line =
    | { kind: "prompt"; text: string }
    | { kind: "agent"; text: string }
    | { kind: "tool"; text: string }
    | { kind: "result"; text: string }
    | { kind: "spacer" };

const SCRIPT: readonly Line[] = [
    { kind: "prompt", text: 'sp> ask "what should I pay first this month?"' },
    { kind: "tool", text: "→ tool: scan_balances(window=30d)" },
    { kind: "tool", text: "→ tool: project_apr_cost(top_n=3)" },
    { kind: "agent", text: "Pay AMEX_PLAT first. Utilization 38.2% — dropping below 30% saves ~12 FICO pts before the Sep 04 statement close. Marriott Bonvoy can wait, autopay covers minimum." },
    { kind: "spacer" },
    { kind: "result", text: "↳ saved $42.18 in projected interest · -1 alert" },
];

const KIND_STYLE = {
    prompt: "text-brand-400",
    agent: "text-zinc-200",
    tool: "text-zinc-500",
    result: "text-amber-300",
    spacer: "",
} as const;

export function AgentTerminal({ className }: { className?: string }) {
    const [visibleCount, setVisibleCount] = useState(0);
    const [typing, setTyping] = useState(""); // current line in-progress
    const [typingIndex, setTypingIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const stateRef = useRef({ killed: false });

    useEffect(() => {
        const state = stateRef.current;
        const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

        if (reduced) {
            setVisibleCount(SCRIPT.length);
            return;
        }

        const tl = gsap.timeline({ delay: 0.4 });

        SCRIPT.forEach((line, idx) => {
            if (line.kind === "spacer") {
                tl.call(() => {
                    if (state.killed) return;
                    setVisibleCount(idx + 1);
                });
                tl.to({}, { duration: 0.18 });
                return;
            }
            // Reveal the line, type its text gradually for prompt/agent
            const speed = line.kind === "agent" ? 0.012 : 0.018;
            const text = line.text;
            tl.call(() => {
                if (state.killed) return;
                setTypingIndex(idx);
                setTyping("");
            });
            text.split("").forEach((ch, i) => {
                tl.call(
                    () => {
                        if (state.killed) return;
                        setTyping(text.slice(0, i + 1));
                    },
                    [],
                    `+=${speed * (line.kind === "tool" ? 0.4 : 1)}`,
                );
            });
            tl.call(() => {
                if (state.killed) return;
                setTypingIndex(null);
                setVisibleCount(idx + 1);
            });
            tl.to({}, { duration: line.kind === "prompt" ? 0.22 : 0.32 });
        });

        return () => {
            state.killed = true;
            tl.kill();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className={cx(
                "relative isolate overflow-hidden border border-white/[0.08] bg-[#08100c]/95 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_30px_80px_-30px_rgba(60,203,127,0.25)]",
                "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_top_right,rgba(60,203,127,0.18),transparent_55%)] before:opacity-80",
                className,
            )}
        >
            {/* Title bar */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/[0.06] bg-black/30 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-500">
                <div className="flex items-center gap-2.5">
                    <span className="flex gap-1">
                        <span className="size-2 rounded-full bg-zinc-700" />
                        <span className="size-2 rounded-full bg-zinc-700" />
                        <span className="size-2 rounded-full bg-brand-500" />
                    </span>
                    <span className="text-zinc-400">sp/agent</span>
                    <span className="text-zinc-700">—</span>
                    <span>session_04a2</span>
                </div>
                <span className="hidden sm:inline">tokens 412 / 8k</span>
            </div>

            {/* Body */}
            <div className="relative z-10 px-4 py-4 font-mono text-[12.5px] leading-relaxed sm:px-6 sm:py-5 sm:text-[13px]">
                <div className="flex flex-col gap-1.5">
                    {SCRIPT.map((line, idx) => {
                        if (line.kind === "spacer") {
                            return idx < visibleCount ? <div key={idx} className="h-1" /> : null;
                        }
                        const isTyping = typingIndex === idx;
                        if (idx >= visibleCount && !isTyping) return null;
                        const display = isTyping ? typing : line.text;
                        return (
                            <div key={idx} className={cx("whitespace-pre-wrap break-words", KIND_STYLE[line.kind])}>
                                {display}
                                {isTyping && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-current align-[-2px]" aria-hidden="true" />}
                            </div>
                        );
                    })}
                </div>

                {/* Idle prompt cursor when finished */}
                {visibleCount === SCRIPT.length ? (
                    <div className="mt-3 flex items-center gap-2 text-brand-400">
                        <span>sp&gt;</span>
                        <span className="inline-block h-3.5 w-1.5 animate-pulse bg-brand-400" aria-hidden="true" />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
