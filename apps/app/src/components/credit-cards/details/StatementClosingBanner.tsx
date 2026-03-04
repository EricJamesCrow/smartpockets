"use client";

import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";

interface StatementClosingBannerProps {
  creditCardId: Id<"creditCards">;
  statementClosingDay?: number | null;
}

export function StatementClosingBanner({
  creditCardId,
  statementClosingDay,
}: StatementClosingBannerProps) {
  const updateCard = useMutation(api.creditCards.mutations.update);
  const [day, setDay] = useState("");
  const [saving, setSaving] = useState(false);

  if (statementClosingDay != null) return null;

  const handleSave = async () => {
    const parsed = parseInt(day, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 31) return;
    setSaving(true);
    try {
      await updateCard({ cardId: creditCardId, statementClosingDay: parsed });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-utility-brand-200 bg-utility-brand-50 p-4">
      <p className="mb-3 text-sm font-medium text-utility-brand-700">
        Set your statement closing date to unlock balance tracking and smart recommendations
      </p>
      <div className="flex items-center gap-3">
        <label htmlFor="statement-closing-day" className="text-xs text-utility-brand-600">Statement closes on day:</label>
        <input
          id="statement-closing-day"
          type="number"
          min={1}
          max={31}
          value={day}
          onChange={(e) => setDay(e.target.value)}
          placeholder="e.g. 15"
          className="w-20 rounded-lg border border-utility-brand-200 bg-white px-3 py-1.5 text-sm tabular-nums text-primary placeholder:text-tertiary focus:border-utility-brand-500 focus:outline-none focus:ring-1 focus:ring-utility-brand-500"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !day}
          className="rounded-lg bg-utility-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-utility-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
