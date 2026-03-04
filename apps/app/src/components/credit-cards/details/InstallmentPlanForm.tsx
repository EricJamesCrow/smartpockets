"use client";

import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";

interface InstallmentPlanFormProps {
  creditCardId: Id<"creditCards">;
  onClose: () => void;
  editingPlan?: {
    _id: Id<"installmentPlans">;
    description: string;
    startDate: string;
    originalPrincipal: number;
    remainingPrincipal: number;
    totalPayments: number;
    remainingPayments: number;
    monthlyPrincipal: number;
    monthlyFee: number;
    aprPercentage: number;
  };
}

export function InstallmentPlanForm({ creditCardId, onClose, editingPlan }: InstallmentPlanFormProps) {
  const createPlan = useMutation(api.installmentPlans.mutations.create);
  const updatePlan = useMutation(api.installmentPlans.mutations.update);

  const [description, setDescription] = useState(editingPlan?.description ?? "");
  const [originalPrincipal, setOriginalPrincipal] = useState(editingPlan?.originalPrincipal?.toString() ?? "");
  const [remainingPrincipal, setRemainingPrincipal] = useState(editingPlan?.remainingPrincipal?.toString() ?? "");
  const [totalPayments, setTotalPayments] = useState(editingPlan?.totalPayments?.toString() ?? "");
  const [remainingPayments, setRemainingPayments] = useState(editingPlan?.remainingPayments?.toString() ?? "");
  const [monthlyPrincipal, setMonthlyPrincipal] = useState(editingPlan?.monthlyPrincipal?.toString() ?? "");
  const [monthlyFee, setMonthlyFee] = useState(editingPlan?.monthlyFee?.toString() ?? "0");
  const [aprPercentage, setAprPercentage] = useState(editingPlan?.aprPercentage?.toString() ?? "0");
  const [startDate, setStartDate] = useState(editingPlan?.startDate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingPlan;

  const handleSave = async () => {
    const parsed = {
      description: description.trim(),
      originalPrincipal: parseFloat(originalPrincipal),
      remainingPrincipal: parseFloat(remainingPrincipal),
      totalPayments: parseInt(totalPayments, 10),
      remainingPayments: parseInt(remainingPayments, 10),
      monthlyPrincipal: parseFloat(monthlyPrincipal),
      monthlyFee: parseFloat(monthlyFee),
      aprPercentage: parseFloat(aprPercentage),
      startDate,
    };

    // Validation
    if (!parsed.description) { setError("Description is required"); return; }
    if (isNaN(parsed.originalPrincipal) || parsed.originalPrincipal < 0) { setError("Invalid original amount"); return; }
    if (isNaN(parsed.remainingPrincipal) || parsed.remainingPrincipal < 0) { setError("Invalid remaining balance"); return; }
    if (parsed.remainingPrincipal > parsed.originalPrincipal) { setError("Remaining balance cannot exceed original amount"); return; }
    if (isNaN(parsed.totalPayments) || parsed.totalPayments < 1) { setError("Invalid total payments"); return; }
    if (isNaN(parsed.remainingPayments) || parsed.remainingPayments < 0) { setError("Invalid remaining payments"); return; }
    if (parsed.remainingPayments > parsed.totalPayments) { setError("Remaining payments cannot exceed total payments"); return; }
    if (isNaN(parsed.monthlyPrincipal) || parsed.monthlyPrincipal < 0) { setError("Invalid monthly payment"); return; }
    if (isNaN(parsed.monthlyFee) || parsed.monthlyFee < 0) { setError("Invalid monthly fee"); return; }
    if (isNaN(parsed.aprPercentage) || parsed.aprPercentage < 0) { setError("Invalid APR"); return; }
    if (!parsed.startDate) { setError("Start date is required"); return; }

    setError(null);
    setSaving(true);
    try {
      if (isEditing) {
        await updatePlan({
          planId: editingPlan._id,
          description: parsed.description,
          remainingPrincipal: parsed.remainingPrincipal,
          remainingPayments: parsed.remainingPayments,
          monthlyPrincipal: parsed.monthlyPrincipal,
          monthlyFee: parsed.monthlyFee,
        });
      } else {
        await createPlan({
          creditCardId,
          ...parsed,
        });
      }
      onClose();
    } catch {
      setError("Could not save installment plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-secondary bg-primary px-3 py-1.5 text-sm tabular-nums text-primary placeholder:text-tertiary focus:border-utility-brand-500 focus:outline-none focus:ring-1 focus:ring-utility-brand-500";
  const labelClass = "block text-xs font-medium text-tertiary mb-1";

  return (
    <div className="rounded-xl border border-secondary bg-primary p-4">
      <h4 className="mb-3 text-sm font-semibold text-primary">
        {isEditing ? "Edit Installment Plan" : "New Installment Plan"}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. MacBook Pro - My Chase Plan" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Original Amount</label>
          <input type="number" min={0} step={0.01} value={originalPrincipal} onChange={(e) => setOriginalPrincipal(e.target.value)} placeholder="1200.00" className={inputClass} disabled={isEditing} />
        </div>
        <div>
          <label className={labelClass}>Remaining Balance</label>
          <input type="number" min={0} step={0.01} value={remainingPrincipal} onChange={(e) => setRemainingPrincipal(e.target.value)} placeholder="800.00" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Total Payments</label>
          <input type="number" min={1} value={totalPayments} onChange={(e) => setTotalPayments(e.target.value)} placeholder="12" className={inputClass} disabled={isEditing} />
        </div>
        <div>
          <label className={labelClass}>Remaining Payments</label>
          <input type="number" min={0} value={remainingPayments} onChange={(e) => setRemainingPayments(e.target.value)} placeholder="8" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Monthly Payment</label>
          <input type="number" min={0} step={0.01} value={monthlyPrincipal} onChange={(e) => setMonthlyPrincipal(e.target.value)} placeholder="100.00" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Monthly Fee</label>
          <input type="number" min={0} step={0.01} value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="1.67" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>APR %</label>
          <input type="number" min={0} step={0.01} value={aprPercentage} onChange={(e) => setAprPercentage(e.target.value)} placeholder="0" className={inputClass} disabled={isEditing} />
        </div>
        <div>
          <label className={labelClass}>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} disabled={isEditing} />
        </div>
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
