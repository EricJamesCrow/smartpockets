"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp } from "@untitledui/icons";
import { cx } from "@/utils/cx";

interface MessageActionMinimalProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MessageActionMinimal({
  onSubmit,
  isLoading,
  disabled,
  className,
}: MessageActionMinimalProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canSubmit = Boolean(value.trim()) && !isLoading && !disabled;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(value.trim());
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const handleInput = () => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 200)}px`;
  };

  return (
    <div
      className={cx(
        "relative flex items-end gap-2 border border-white/10 bg-[#0a0d10] p-2 transition-colors duration-150 focus-within:border-brand-500/50",
        className,
      )}
    >
      <span
        className="pointer-events-none select-none px-2 pt-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-600"
        aria-hidden="true"
      >
        ▸
      </span>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Query the ledger…"
        aria-label="Send a message"
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none bg-transparent px-1 py-2 font-[family-name:var(--font-jetbrains-mono)] text-[13.5px] tracking-[0.01em] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        aria-label="Send"
        className="flex size-9 items-center justify-center bg-brand-500 text-[#04140a] transition-[transform,background-color,box-shadow] duration-150 hover:bg-brand-400 active:translate-y-px disabled:opacity-30"
      >
        <ArrowUp className="size-5" />
      </button>
    </div>
  );
}
