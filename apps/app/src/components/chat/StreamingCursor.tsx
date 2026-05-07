"use client";

export function StreamingCursor() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-[1em] w-[2px] -mb-0.5 align-middle bg-current opacity-60 motion-safe:animate-[sp-cursor-pulse_1s_ease-in-out_infinite]"
    />
  );
}
