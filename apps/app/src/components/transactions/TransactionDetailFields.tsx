"use client";

import { useState, useEffect } from "react";
import type { Key } from "react-aria-components";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { ButtonUtility } from "@repo/ui/untitledui/base/buttons/button-utility";
import { Select } from "@repo/ui/untitledui/base/select/select";
import { DatePicker } from "@repo/ui/untitledui/application/date-picker/date-picker";
import { TextArea } from "@repo/ui/untitledui/base/textarea/textarea";
import { Check, Copy01 } from "@untitledui/icons";
import { InlineEditableField } from "@/components/credit-cards/details/InlineEditableField";
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
        userTime?: string;
      }
    | null
    | undefined;
  savingField: string | null;
  upsertField: (
    field: "notes" | "userCategory" | "userDate" | "userMerchantName" | "userTime",
    value: string | null
  ) => Promise<void>;
}

const categoryItems = TRANSACTION_CATEGORIES.map((cat) => ({
  id: cat,
  label: cat,
}));

function extractTimeFromDatetime(datetime?: string): string | null {
  if (!datetime) return null;
  try {
    const date = new Date(datetime);
    if (isNaN(date.getTime())) return null;
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return null;
  }
}

function formatTime12hr(time24: string | number | null | undefined): string {
  if (time24 == null || time24 === "") return "—";
  const str = String(time24);
  const [hoursStr, minutesStr] = str.split(":");
  const hours = parseInt(hoursStr ?? "0", 10);
  const minutes = minutesStr ?? "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Editable fields section of the transaction detail panel.
 *
 * Includes: original statement (copy), date picker, category dropdown,
 * and notes textarea.
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

  // Time: only show when datetime exists from Plaid
  const plaidTime = extractTimeFromDatetime(transaction.datetime);
  const currentTime = overlay?.userTime ?? plaidTime;
  const hasTime = plaidTime !== null;

  const handleTimeSave = async (newValue: string | number) => {
    await upsertField("userTime", String(newValue));
  };

  const handleTimeRevert = async () => {
    await upsertField("userTime", null);
  };

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
          {/*
            CROWDEV-364: Swap copy icon → checkmark on success instead of
            showing a "Copied" text label. Tooltip flips to "Copied" so
            assistive tech and hover users still see the success state.
          */}
          <ButtonUtility
            icon={copied ? Check : Copy01}
            size="xs"
            color="tertiary"
            tooltip={copied ? "Copied" : "Copy original statement"}
            onClick={handleCopy}
          />
        </div>
      </div>

      {/* Date + Time row */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
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
        {hasTime && (
          <div className="w-28 shrink-0">
            <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
              Time
            </label>
            <div className="mt-1">
              <InlineEditableField
                value={currentTime}
                plaidValue={plaidTime}
                isOverridden={overlay?.userTime != null}
                type="text"
                onSave={handleTimeSave}
                onRevert={handleTimeRevert}
                formatDisplay={formatTime12hr}
                placeholder="—"
              />
            </div>
          </div>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
          Category
        </label>
        <div className="mt-1">
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
    </div>
  );
}
