"use client";

import { useState, useCallback, useRef } from "react";
import { cx } from "@repo/ui/utils";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Copy01, ScissorsCut01, Tag01, Attachment01 } from "@untitledui/icons";
import {
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
} from "@/types/credit-cards";
import type { DetailPanelTransaction } from "./TransactionDetailPanel";

interface TransactionDetailFieldsProps {
  transaction: DetailPanelTransaction;
  overlay:
    | {
        notes?: string;
        userCategory?: string;
        userDate?: string;
        userMerchantName?: string;
      }
    | null
    | undefined;
  savingField: string | null;
  upsertField: (
    field: "notes" | "userCategory" | "userDate" | "userMerchantName",
    value: string | null
  ) => Promise<void>;
}

/**
 * Editable fields section of the transaction detail panel.
 *
 * Includes: original statement (copy), date picker, category dropdown,
 * split placeholder, notes textarea, and deferred tag/attachment placeholders.
 */
export function TransactionDetailFields({
  transaction,
  overlay,
  savingField,
  upsertField,
}: TransactionDetailFieldsProps) {
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolved values (overlay wins over transaction defaults)
  const currentCategory = (overlay?.userCategory ?? transaction.category) as TransactionCategory;
  const currentDate = overlay?.userDate ?? transaction.date;
  const currentNotes = notes ?? overlay?.notes ?? "";

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(transaction.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [transaction.name]);

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void upsertField("notes", value || null);
      }, 500);
    },
    [upsertField]
  );

  const handleNotesBlur = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    // Skip blur save if user hasn't typed and overlay is still loading
    // to avoid clearing existing notes with a spurious null write
    if (notes === undefined && overlay === undefined) return;
    const value = notes ?? overlay?.notes ?? "";
    void upsertField("notes", value || null);
  }, [notes, overlay, upsertField]);

  return (
    <div className="flex flex-col gap-5">
      {/* Original Statement */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
          Original Statement
        </label>
        <div className="mt-1 flex items-center gap-2">
          <span className="flex-1 truncate text-sm text-secondary">
            {transaction.name}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded p-1 text-tertiary hover:bg-primary_hover hover:text-secondary"
            aria-label="Copy original statement"
          >
            <Copy01 className="size-4" />
          </button>
          {copied && (
            <span className="text-xs text-utility-success-600">Copied</span>
          )}
        </div>
      </div>

      {/* Date */}
      <div>
        <label
          htmlFor="txn-date"
          className="text-xs font-semibold uppercase tracking-wider text-tertiary"
        >
          Date
        </label>
        <input
          id="txn-date"
          type="date"
          value={currentDate}
          onChange={(e) => void upsertField("userDate", e.target.value || null)}
          className={cx(
            "mt-1 block w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary",
            "focus:border-brand-solid focus:outline-none focus:ring-1 focus:ring-brand-solid",
            savingField === "userDate" && "opacity-60"
          )}
        />
      </div>

      {/* Category */}
      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="txn-category"
            className="text-xs font-semibold uppercase tracking-wider text-tertiary"
          >
            Category
          </label>
          <Button
            color="tertiary"
            size="sm"
            iconLeading={ScissorsCut01}
            isDisabled
          >
            Split
          </Button>
        </div>
        <select
          id="txn-category"
          value={currentCategory}
          onChange={(e) =>
            void upsertField("userCategory", e.target.value || null)
          }
          className={cx(
            "mt-1 block w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary",
            "focus:border-brand-solid focus:outline-none focus:ring-1 focus:ring-brand-solid",
            savingField === "userCategory" && "opacity-60"
          )}
        >
          {TRANSACTION_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="txn-notes"
          className="text-xs font-semibold uppercase tracking-wider text-tertiary"
        >
          Notes
        </label>
        <textarea
          id="txn-notes"
          rows={3}
          value={currentNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add a note..."
          className={cx(
            "mt-1 block w-full resize-none rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary",
            "focus:border-brand-solid focus:outline-none focus:ring-1 focus:ring-brand-solid",
            savingField === "notes" && "opacity-60"
          )}
        />
      </div>

      {/* Deferred: Tags */}
      <div className="opacity-50">
        <div className="flex items-center gap-2">
          <Tag01 className="size-4 text-tertiary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">
            Tags
          </span>
        </div>
        <p className="mt-1 text-sm text-quaternary">Coming soon</p>
      </div>

      {/* Deferred: Attachments */}
      <div className="opacity-50">
        <div className="flex items-center gap-2">
          <Attachment01 className="size-4 text-tertiary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">
            Attachments
          </span>
        </div>
        <p className="mt-1 text-sm text-quaternary">Coming soon</p>
      </div>
    </div>
  );
}
