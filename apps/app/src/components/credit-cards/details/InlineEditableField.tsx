"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const displayValue = formatDisplay
    ? formatDisplay(value)
    : value != null
      ? String(value)
      : placeholder;

  const startEditing = () => {
    setDraft(value != null ? String(value) : "");
    setError(null);
    setIsEditing(true);
  };

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
    if (saving) return;

    const validated = validate(draft);
    if (validated === null) {
      setError(getValidationMessage(type));
      return;
    }

    // eslint-disable-next-line eqeqeq
    if (validated == value) {
      setIsEditing(false);
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
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu]);

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
            if (!saving) {
              if (!draft.trim()) {
                handleCancel();
              } else {
                handleSave();
              }
            }
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
      {contextMenu &&
        createPortal(
          <div
            className="fixed z-50 rounded-lg border border-secondary bg-primary py-1 text-sm shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              className="w-full cursor-pointer px-3 py-1.5 text-left text-primary hover:bg-secondary"
              onClick={async () => {
                setContextMenu(null);
                await onRevert?.();
              }}
            >
              {plaidValue != null && plaidValue !== "" ? "Revert" : "Clear"}
            </button>
          </div>,
          document.body
        )}
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
