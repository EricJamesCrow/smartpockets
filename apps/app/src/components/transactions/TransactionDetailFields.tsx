"use client";

import { useState, useEffect } from "react";
import type { Key } from "react-aria-components";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { ButtonUtility } from "@repo/ui/untitledui/base/buttons/button-utility";
import { Select } from "@repo/ui/untitledui/base/select/select";
import { DatePicker } from "@repo/ui/untitledui/application/date-picker/date-picker";
import { TextArea } from "@repo/ui/untitledui/base/textarea/textarea";
import { TagGroup, TagList, Tag } from "@repo/ui/untitledui/base/tags/tags";
import { FileUpload } from "@repo/ui/untitledui/application/file-upload/file-upload-base";
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

const categoryItems = TRANSACTION_CATEGORIES.map((cat) => ({
  id: cat,
  label: cat,
}));

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
  const [pendingDate, setPendingDate] = useState<DateValue | null>(null);

  // Resolved values (overlay wins over transaction defaults)
  const currentCategory = (overlay?.userCategory ??
    transaction.category) as TransactionCategory;
  const currentDate = overlay?.userDate ?? transaction.date;
  const currentNotes = notes ?? overlay?.notes ?? "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transaction.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCategoryChange = (key: Key | null) => {
    if (key !== null) {
      void upsertField("userCategory", key as string);
    }
  };

  const handleDateChange = (value: DateValue | null) => {
    setPendingDate(value);
  };

  const handleDateApply = () => {
    if (pendingDate) {
      void upsertField("userDate", pendingDate.toString());
      setPendingDate(null);
    }
  };

  const handleDateCancel = () => {
    setPendingDate(null);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
  };

  const handleNotesBlur = () => {
    if (notes === undefined && overlay === undefined) return;
    const value = notes ?? overlay?.notes ?? "";
    void upsertField("notes", value || null);
    setNotes(undefined); // Reset dirty flag — prevents debounce effect from double-firing
  };

  // Debounced auto-save for notes
  useEffect(() => {
    if (notes === undefined) return;
    const timer = setTimeout(() => {
      void upsertField("notes", notes || null);
    }, 500);
    return () => clearTimeout(timer);
  }, [notes, upsertField]);

  // DatePicker value: use pending selection if active, otherwise current date
  const datePickerValue = pendingDate ?? parseDate(currentDate);

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
          <ButtonUtility
            icon={Copy01}
            size="xs"
            color="tertiary"
            tooltip="Copy original statement"
            onClick={handleCopy}
          />
          {copied && (
            <span className="text-xs text-utility-success-600">Copied</span>
          )}
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
          Date
        </label>
        <div className="mt-1">
          <DatePicker
            value={datePickerValue}
            onChange={handleDateChange}
            onApply={handleDateApply}
            onCancel={handleDateCancel}
            isDisabled={savingField === "userDate"}
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
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
        <Select
          items={categoryItems}
          selectedKey={currentCategory}
          onSelectionChange={handleCategoryChange}
          placeholder="Select category"
          size="sm"
          isDisabled={savingField === "userCategory"}
        >
          {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
        </Select>
      </div>

      {/* Notes */}
      <div>
        <TextArea
          label="Notes"
          placeholder="Add a note..."
          rows={3}
          value={currentNotes}
          onChange={handleNotesChange}
          onBlur={handleNotesBlur}
          isDisabled={savingField === "notes"}
        />
      </div>

      {/* Deferred: Tags */}
      <div className="pointer-events-none opacity-50">
        <div className="mb-2 flex items-center gap-2">
          <Tag01 className="size-4 text-tertiary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">
            Tags
          </span>
        </div>
        <TagGroup label="Transaction tags" size="sm">
          <TagList>
            <Tag id="food" isDisabled>
              Food
            </Tag>
            <Tag id="recurring" isDisabled>
              Recurring
            </Tag>
            <Tag id="business" isDisabled>
              Business
            </Tag>
          </TagList>
        </TagGroup>
      </div>

      {/* Deferred: Attachments */}
      <div className="pointer-events-none opacity-50">
        <div className="mb-2 flex items-center gap-2">
          <Attachment01 className="size-4 text-tertiary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">
            Attachments
          </span>
        </div>
        <FileUpload.DropZone
          isDisabled
          hint="PNG, JPG or PDF (max. 5MB)"
          accept="image/*,.pdf"
        />
      </div>
    </div>
  );
}
