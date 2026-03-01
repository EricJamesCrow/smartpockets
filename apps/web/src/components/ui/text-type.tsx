"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface TextTypeProps {
  text: string;
  className?: string;
  delay?: number;
  speed?: number;
  cursor?: boolean;
  cursorChar?: string;
  keepCursor?: boolean;
  onComplete?: () => void;
}

export function TextType({
  text,
  className = "",
  delay = 0,
  speed = 0.05,
  cursor = true,
  cursorChar = "|",
  keepCursor = false,
  onComplete,
}: TextTypeProps) {
  const [displayText, setDisplayText] = useState("");
  const [showCursor, setShowCursor] = useState(cursor);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const timeline = gsap.timeline({
      delay,
      onComplete: () => {
        if (cursor && !keepCursor) {
          // Fade out cursor after typing completes
          gsap.to(cursorRef.current, {
            opacity: 0,
            duration: 0.3,
            delay: 0.5,
            onComplete: () => setShowCursor(false),
          });
        }
        onComplete?.();
      },
    });

    let currentIndex = 0;
    const chars = text.split("");

    // Type each character
    chars.forEach((char, index) => {
      timeline.call(
        () => {
          setDisplayText(text.substring(0, currentIndex + 1));
          currentIndex++;
        },
        [],
        index * speed
      );
    });

    // Animate cursor blink
    if (cursor && cursorRef.current) {
      gsap.to(cursorRef.current, {
        opacity: 0,
        duration: 0.4,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
      });
    }

    return () => {
      timeline.kill();
    };
  }, [text, delay, speed, cursor, onComplete]);

  return (
    <span className={className}>
      {displayText}
      {showCursor && (
        <span
          ref={cursorRef}
          className="inline-block ml-0.5 opacity-100"
          aria-hidden="true"
        >
          {cursorChar}
        </span>
      )}
    </span>
  );
}
