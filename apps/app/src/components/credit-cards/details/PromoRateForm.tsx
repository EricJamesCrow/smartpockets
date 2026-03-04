"use client";

import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";

interface PromoRateFormProps {
  creditCardId: Id<"creditCards">;
  onClose: () => void;
  editingPromo?: {
    _id: Id<"promoRates">;
    description: string;
    aprPercentage: number;
    originalBalance: number;
    remainingBalance: number;
    startDate: string;
    expirationDate: string;
    isDeferredInterest: boolean;
    accruedDeferredInterest?: number;
    monthlyMinimumPayment?: number;
  };
}

export function PromoRateForm({ creditCardId, onClose, editingPromo }: PromoRateFormProps) {
  const createPromo = useMutation(api.promoRates.mutations.create);
  const updatePromo = useMutation(api.promoRates.mutations.update);

  const [description, setDescription] = useState(editingPromo?.description ?? "");
  const [aprPercentage, setAprPercentage] = useState(editingPromo?.aprPercentage?.toString() ?? "0");
  const [originalBalance, setOriginalBalance] = useState(editingPromo?.originalBalance?.toString() ?? "");
  const [remainingBalance, setRemainingBalance] = useState(editingPromo?.remainingBalance?.toString() ?? "");
  const [startDate, setStartDate] = useState(editingPromo?.startDate ?? "");
  const [expirationDate, setExpirationDate] = useState(editingPromo?.expirationDate ?? "");
  const [isDeferredInterest, setIsDeferredInterest] = useState(editingPromo?.isDeferredInterest ?? false);
  const [accruedDeferredInterest, setAccruedDeferredInterest] = useState(editingPromo?.accruedDeferredInterest?.toString() ?? "");
  const [monthlyMinimumPayment, setMonthlyMinimumPayment] = useState(editingPromo?.monthlyMinimumPayment?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingPromo;

  const handleSave = async () => {
    const parsed = {
      description: description.trim(),
      aprPercentage: parseFloat(aprPercentage),
      originalBalance: parseFloat(originalBalance),
      remainingBalance: parseFloat(remainingBalance),
      startDate,
      expirationDate,
      isDeferredInterest,
      accruedDeferredInterest: accruedDeferredInterest ? parseFloat(accruedDeferredInterest) : undefined,
      monthlyMinimumPayment: monthlyMinimumPayment ? parseFloat(monthlyMinimumPayment) : undefined,
    };

    // Validation
    if (!parsed.description) { setError("Description is required"); return; }
    if (isNaN(parsed.aprPercentage) || parsed.aprPercentage < 0) { setError("Invalid APR"); return; }
    if (isNaN(parsed.originalBalance) || parsed.originalBalance < 0) { setError("Invalid original balance"); return; }
    if (isNaN(parsed.remainingBalance) || parsed.remainingBalance < 0) { setError("Invalid remaining balance"); return; }
    if (parsed.remainingBalance > parsed.originalBalance) { setError("Remaining balance cannot exceed original balance"); return; }
    if (!parsed.startDate || !parsed.expirationDate) { setError("Dates are required"); return; }
    if (parsed.expirationDate <= parsed.startDate) { setError("Expiration date must be after start date"); return; }

    setError(null);
    setSaving(true);
    try {
      if (isEditing) {
        await updatePromo({
          promoRateId: editingPromo._id,
          description: parsed.description,
          remainingBalance: parsed.remainingBalance,
          accruedDeferredInterest: parsed.accruedDeferredInterest,
          monthlyMinimumPayment: parsed.monthlyMinimumPayment,
        });
      } else {
        await createPromo({
          creditCardId,
          ...parsed,
        });
      }
      onClose();
    } catch {
      setError("Could not save promotional rate. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-secondary bg-primary px-3 py-1.5 text-sm tabular-nums text-primary placeholder:text-tertiary focus:border-utility-brand-500 focus:outline-none focus:ring-1 focus:ring-utility-brand-500";
  const labelClass = "block text-xs font-medium text-tertiary mb-1";

  return (
    <div className="rounded-xl border border-secondary bg-primary p-4">
      <h4 className="mb-3 text-sm font-semibold text-primary">
        {isEditing ? "Edit Promotional Rate" : "New Promotional Rate"}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Balance Transfer - 0% intro" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>APR %</label>
          <input type="number" min={0} step={0.01} value={aprPercentage} onChange={(e) => setAprPercentage(e.target.value)} placeholder="0" className={inputClass} disabled={isEditing} />
        </div>
        <div>
          <label className={labelClass}>Original Balance</label>
          <input type="number" min={0} step={0.01} value={originalBalance} onChange={(e) => setOriginalBalance(e.target.value)} placeholder="3000.00" className={inputClass} disabled={isEditing} />
        </div>
        <div>
          <label className={labelClass}>Remaining Balance</label>
          <input type="number" min={0} step={0.01} value={remainingBalance} onChange={(e) => setRemainingBalance(e.target.value)} placeholder="2500.00" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Monthly Minimum</label>
          <input type="number" min={0} step={0.01} value={monthlyMinimumPayment} onChange={(e) => setMonthlyMinimumPayment(e.target.value)} placeholder="25.00" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} disabled={isEditing} />
        </div>
        <div>
          <label className={labelClass}>Expiration Date</label>
          <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} className={inputClass} />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input
            id="deferred-interest"
            type="checkbox"
            checked={isDeferredInterest}
            onChange={(e) => setIsDeferredInterest(e.target.checked)}
            className="h-4 w-4 rounded border-secondary text-utility-brand-600 focus:ring-utility-brand-500"
            disabled={isEditing}
          />
          <label htmlFor="deferred-interest" className="text-xs text-tertiary">
            Deferred interest (interest accrues and is charged if balance isn't paid by expiration)
          </label>
        </div>
        {isDeferredInterest && (
          <div className="col-span-2">
            <label className={labelClass}>Accrued Deferred Interest</label>
            <input type="number" min={0} step={0.01} value={accruedDeferredInterest} onChange={(e) => setAccruedDeferredInterest(e.target.value)} placeholder="0.00" className={inputClass} />
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-utility-error-700">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-tertiary transition-colors hover:text-primary">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving || !description} className="rounded-lg bg-utility-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-utility-brand-700 disabled:opacity-50">
          {saving ? "Saving..." : isEditing ? "Update" : "Save"}
        </button>
      </div>
    </div>
  );
}
