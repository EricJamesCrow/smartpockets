"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface RevealProps {
    children: ReactNode;
    delay?: number;
    y?: number;
    duration?: number;
    className?: string;
    as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Slow, deliberate scroll reveal. Animates `y` and opacity once on enter.
 * Use sparingly — one focal element per viewport.
 */
export function Reveal({
    children,
    delay = 0,
    y = 28,
    duration = 1.2,
    className,
    as: Tag = "div",
}: RevealProps) {
    const ref = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce) {
            gsap.set(node, { opacity: 1, y: 0 });
            return;
        }

        gsap.set(node, { opacity: 0, y });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        gsap.to(node, {
                            opacity: 1,
                            y: 0,
                            duration,
                            delay,
                            ease: "power3.out",
                        });
                        observer.unobserve(node);
                    }
                });
            },
            { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, [delay, duration, y]);

    return (
        // @ts-expect-error - dynamic tag
        <Tag ref={ref} className={className}>
            {children}
        </Tag>
    );
}

interface StaggerProps {
    children: ReactNode;
    delay?: number;
    stagger?: number;
    y?: number;
    className?: string;
    selector?: string;
}

/**
 * Stagger children. Targets direct children by default.
 * Slow stagger (default 0.12s) per editorial mood prompt.
 */
export function Stagger({
    children,
    delay = 0,
    stagger = 0.12,
    y = 24,
    className,
    selector = ":scope > *",
}: StaggerProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const items = Array.from(node.querySelectorAll<HTMLElement>(selector));
        if (items.length === 0) return;

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce) {
            gsap.set(items, { opacity: 1, y: 0 });
            return;
        }

        gsap.set(items, { opacity: 0, y });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        gsap.to(items, {
                            opacity: 1,
                            y: 0,
                            duration: 1.0,
                            delay,
                            stagger,
                            ease: "power3.out",
                        });
                        observer.unobserve(node);
                    }
                });
            },
            { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, [delay, stagger, y, selector]);

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}
