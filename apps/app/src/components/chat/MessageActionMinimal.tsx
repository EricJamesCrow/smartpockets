"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp } from "@untitledui/icons";
import { StopButton } from "@/components/chat/StopButton";
import { cx } from "@/utils/cx";

interface MessageActionMinimalProps {
  onSubmit: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MessageActionMinimal({
  onSubmit,
  onStop,
  isLoading,
  isStreaming,
  disabled,
  className,
}: MessageActionMinimalProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canSubmit = Boolean(value.trim()) && !isLoading && !disabled;
  const showStop = Boolean(isStreaming && onStop);

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(value.trim());
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // IME composition guard: ignore events fired mid-composition (Japanese, Chinese, Korean).
    if (event.nativeEvent.isComposing) return;

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submit();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (value.trim()) {
        setValue("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      } else {
        textareaRef.current?.blur();
      }
      return;
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
        "relative flex items-end gap-2 rounded-3xl border border-secondary bg-primary p-2 shadow-xs transition-[box-shadow,border-color] duration-300 focus-within:shadow-md focus-within:border-[var(--sp-moss-mint)]/40",
        "dark:border-[var(--sp-moss-line-strong)] dark:bg-[var(--sp-surface-panel-strong)] dark:shadow-[var(--sp-inset-hairline-strong)] dark:focus-within:border-[var(--sp-moss-mint)]/40",
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
      {showStop && onStop ? (
        <StopButton onStop={onStop} />
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label="Send"
          className="flex size-11 items-center justify-center rounded-full bg-brand-solid text-white shadow-[0_4px_14px_rgba(127,184,154,0.25)] transition-all duration-300 hover:scale-[1.04] hover:brightness-110 active:scale-[0.96] active:brightness-95 disabled:opacity-40 md:size-9"
        >
          <ArrowUp className="size-5" />
        </button>
      )}
    </div>
  );
}
