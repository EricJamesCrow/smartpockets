"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cx } from "@repo/ui/utils";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

type RevealProps = {
    children: ReactNode;
    className?: string;
    as?: keyof React.JSX.IntrinsicElements;
    /** Stagger child elements (matches selector). When unset, the wrapper itself animates. */
    stagger?: string;
    delay?: number;
    /** Vertical offset (px) the element rises from. */
    distance?: number;
};

/**
 * Scroll-revealed wrapper.
 *
 * Hides children only after JS confirms ScrollTrigger is wired up — this way
 * users without JS still see the content in its final state. Once mounted,
 * targets fade in with a soft blur lift on first entry into the viewport.
 */
export const Reveal = ({ children, className, as = "div", stagger, delay = 0, distance = 24 }: RevealProps) => {
    const ref = useRef<HTMLElement | null>(null);
    const Tag = as as React.ElementType;

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const targets = stagger ? Array.from(node.querySelectorAll<HTMLElement>(stagger)) : [node];

        if (!targets.length || reduced) return;

        const ctx = gsap.context(() => {
            // Set initial state only AFTER JS confirms it can animate.
            gsap.set(targets, { autoAlpha: 0, y: distance, filter: "blur(8px)" });

            const tween = gsap.to(targets, {
                autoAlpha: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 0.9,
                delay,
                ease: "power3.out",
                stagger: stagger ? 0.08 : 0,
                scrollTrigger: {
                    trigger: node,
                    start: "top 92%",
                    once: true,
                    // Fire immediately if the element is already in view at mount.
                    refreshPriority: 1,
                },
            });

            return () => {
                tween.scrollTrigger?.kill();
                tween.kill();
            };
        }, node);

        // Refresh once — covers the case where layout shifts (web fonts, images)
        // pushed the trigger boundary past the viewport before it could fire.
        const refreshId = window.requestAnimationFrame(() => ScrollTrigger.refresh());

        return () => {
            window.cancelAnimationFrame(refreshId);
            ctx.revert();
        };
    }, [stagger, delay, distance]);

    return (
        <Tag ref={ref} className={cx(className)}>
            {children}
        </Tag>
    );
};
