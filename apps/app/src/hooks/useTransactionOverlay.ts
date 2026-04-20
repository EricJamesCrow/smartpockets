"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

/**
 * Hook for reading and writing transaction overlay data.
 *
 * Fetches the overlay for a Plaid transaction (reactive — auto-updates on mutation)
 * and provides convenience wrappers around the upsertField, toggleReviewed,
 * and toggleHidden mutations with per-field saving state.
 *
 * @param plaidTransactionId - The Plaid transaction ID, or null to skip the query
 */
export function useTransactionOverlay(plaidTransactionId: string | null) {
  const [savingField, setSavingField] = useState<string | null>(null);

  // Fetch overlay (reactive — auto-updates on mutation)
  const overlay = useQuery(
    api.transactionOverlays.queries.getByTransactionId,
    plaidTransactionId ? { plaidTransactionId } : "skip"
  );

  // Mutations
  const upsertFieldMutation = useMutation(
    api.transactionOverlays.mutations.upsertField
  );
  const toggleReviewedMutation = useMutation(
    api.transactionOverlays.mutations.toggleReviewed
  );
  const toggleHiddenMutation = useMutation(
    api.transactionOverlays.mutations.toggleHidden
  );

  const upsertField = async (
    field: "notes" | "userCategory" | "userDate" | "userMerchantName" | "userTime",
    value: string | null
  ) => {
    if (!plaidTransactionId) return;
    setSavingField(field);
    try {
      await upsertFieldMutation({ plaidTransactionId, field, value });
    } finally {
      setSavingField(null);
    }
  };

  const toggleReviewed = async (isReviewed: boolean) => {
    if (!plaidTransactionId) return;
    setSavingField("isReviewed");
    try {
      await toggleReviewedMutation({ plaidTransactionId, isReviewed });
    } finally {
      setSavingField(null);
    }
  };

  const toggleHidden = async (isHidden: boolean) => {
    if (!plaidTransactionId) return;
    setSavingField("isHidden");
    try {
      await toggleHiddenMutation({ plaidTransactionId, isHidden });
    } finally {
      setSavingField(null);
    }
  };

  return {
    overlay,
    isLoading: plaidTransactionId !== null && overlay === undefined,
    savingField,
    upsertField,
    toggleReviewed,
    toggleHidden,
  };
}
