"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cx } from "@/utils/cx";

type FieldType = "text" | "number" | "currency" | "percentage" | "date" | "url";

interface InlineEditableFieldProps {
  value: string | number | null | undefined;
  plaidValue?: string | number | null | undefined;
  isOverridden: boolean;
  type: FieldType;
  onSave: (newValue: string | number) => Promise<void>;
  onRevert?: () => Promise<void>;
  formatDisplay?: (value: string | number | null | undefined) => string;
  className?: string;
  placeholder?: string;
}

export function InlineEditableField({
  value,
  plaidValue,
  isOverridden,
  type,
  onSave,
  onRevert,
  formatDisplay,
  className,
  placeholder = "—",
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  const displayValue = formatDisplay
    ? formatDisplay(value)
    : value != null
      ? String(value)
      : placeholder;

  const startEditing = useCallback(() => {
    setDraft(value != null ? String(value) : "");
    setError(null);
    setIsEditing(true);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const validate = (raw: string): string | number | null => {
    if (!raw.trim()) return null;

    switch (type) {
      case "number":
      case "currency":
      case "percentage": {
        const num = parseFloat(raw);
        if (isNaN(num)) return null;
        if (type === "percentage" && (num < 0 || num > 100)) return null;
        return num;
      }
      case "url": {
        try {
          new URL(raw);
          return raw;
        } catch {
          return null;
        }
      }
      case "date": {
        const date = new Date(raw);
        if (isNaN(date.getTime())) return null;
        return raw;
      }
      default:
        return raw.trim();
    }
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    savingRef.current = true;

    const validated = validate(draft);
    if (validated === null) {
      setError(getValidationMessage(type));
      savingRef.current = false;
      return;
    }

    // If value unchanged from current, just close without saving
    // eslint-disable-next-line eqeqeq
    if (validated == value) {
      setIsEditing(false);
      savingRef.current = false;
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(validated);
      setIsEditing(false);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isOverridden || !onRevert) return;
    e.preventDefault();

    // Create and show context menu
    const menu = document.createElement("div");
    menu.className =
      "fixed z-50 rounded-lg border border-secondary bg-primary shadow-lg py-1 text-sm";
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    const formattedPlaid = formatDisplay
      ? formatDisplay(plaidValue)
      : plaidValue != null
        ? String(plaidValue)
        : "default";

    const item = document.createElement("button");
    item.className =
      "w-full px-3 py-1.5 text-left hover:bg-secondary text-primary cursor-pointer";
    item.textContent = `Revert to Plaid value: ${formattedPlaid}`;
    item.onclick = async () => {
      document.removeEventListener("click", cleanup);
      document.body.removeChild(menu);
      await onRevert();
    };
    menu.appendChild(item);

    const cleanup = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        if (document.body.contains(menu)) {
          document.body.removeChild(menu);
        }
        document.removeEventListener("click", cleanup);
      }
    };
    document.addEventListener("click", cleanup);
    document.body.appendChild(menu);
  };

  if (isEditing) {
    return (
      <div className={cx("flex flex-col", className)}>
        <input
          ref={inputRef}
          type={type === "date" ? "date" : type === "number" || type === "currency" || type === "percentage" ? "number" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (!savingRef.current) handleSave();
          }}
          step={type === "percentage" ? "0.01" : type === "currency" ? "0.01" : undefined}
          disabled={saving}
          className={cx(
            "rounded border border-utility-brand-300 bg-primary px-2 py-0.5 text-sm font-medium tabular-nums text-primary outline-none ring-1 ring-utility-brand-300 focus:border-utility-brand-500 focus:ring-utility-brand-500",
            type === "number" || type === "currency" || type === "percentage" ? "w-24 text-right" : "w-full",
          )}
        />
        {error && (
          <span className="mt-0.5 text-xs text-utility-error-700">{error}</span>
        )}
      </div>
    );
  }

  return (
    <span
      className={cx(
        "group inline-flex cursor-pointer items-center gap-1.5 rounded px-1 -mx-1 transition-colors hover:bg-secondary",
        className,
      )}
      onDoubleClick={startEditing}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startEditing();
        }
      }}
      onContextMenu={handleContextMenu}
      tabIndex={0}
      role="button"
      aria-label={`Edit ${displayValue}. Double-click to edit.${isOverridden ? " Modified from original." : ""}`}
    >
      {isOverridden && (
        <span
          className="inline-block h-1 w-1 flex-shrink-0 rounded-full bg-utility-brand-500"
          aria-hidden="true"
        />
      )}
      <span className="text-sm font-medium text-primary">{displayValue}</span>
    </span>
  );
}

function getValidationMessage(type: FieldType): string {
  switch (type) {
    case "number":
    case "currency":
      return "Please enter a valid number.";
    case "percentage":
      return "Please enter a percentage between 0 and 100.";
    case "url":
      return "Please enter a valid URL (e.g. https://...).";
    case "date":
      return "Please enter a valid date.";
    default:
      return "Please enter a valid value.";
  }
}
