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
        "relative flex items-end gap-2 rounded-3xl border border-secondary bg-primary p-2 shadow-xs transition-shadow duration-300 focus-within:shadow-md",
        "dark:border-white/[0.10] dark:bg-white/[0.04] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:focus-within:border-[#7fb89a]/40",
        className,
      )}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask SmartPockets anything..."
        aria-label="Send a message"
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:outline-none dark:placeholder:text-stone-500"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        aria-label="Send"
        className="flex size-9 items-center justify-center rounded-full bg-brand-solid text-white shadow-[0_4px_14px_rgba(127,184,154,0.25)] transition-all duration-300 disabled:opacity-40 hover:scale-[1.04] active:scale-[0.96]"
      >
        <ArrowUp className="size-5" />
      </button>
    </div>
  );
}
