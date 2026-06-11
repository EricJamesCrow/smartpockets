"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

type OverlayField = "notes" | "userCategory" | "userDate" | "userMerchantName" | "userTime";

type TransactionOverlay = {
    plaidTransactionId: string;
    isReviewed?: boolean;
    reviewedAt?: number;
    isHidden?: boolean;
    notes?: string;
    userCategory?: string;
    userCategoryDetailed?: string;
    userDate?: string;
    userMerchantName?: string;
    userTime?: string;
} | null;

type OptimisticFields = Partial<Record<OverlayField, string | undefined>>;

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
    const [optimisticFields, setOptimisticFields] = useState<OptimisticFields>({});

    // Fetch overlay (reactive — auto-updates on mutation)
    const overlay = useQuery(api.transactionOverlays.queries.getByTransactionId, plaidTransactionId ? { plaidTransactionId } : "skip");

    // Mutations
    const upsertFieldMutation = useMutation(api.transactionOverlays.mutations.upsertField);
    const toggleReviewedMutation = useMutation(api.transactionOverlays.mutations.toggleReviewed);
    const toggleHiddenMutation = useMutation(api.transactionOverlays.mutations.toggleHidden);

    useEffect(() => {
        setOptimisticFields({});
    }, [plaidTransactionId]);

    useEffect(() => {
        if (overlay === undefined) return;

        setOptimisticFields((current) => {
            const entries = Object.entries(current) as Array<[OverlayField, string | undefined]>;
            const staleEntries = entries.filter(([field, value]) => overlay?.[field] !== value);

            if (staleEntries.length === entries.length) {
                return current;
            }

            return Object.fromEntries(staleEntries) as OptimisticFields;
        });
    }, [overlay]);

    const resolvedOverlay = useMemo<TransactionOverlay | undefined>(() => {
        const optimisticEntries = Object.entries(optimisticFields);
        if (overlay === undefined) {
            if (optimisticEntries.length === 0) return undefined;
            return {
                plaidTransactionId: plaidTransactionId ?? "",
                ...optimisticFields,
            };
        }
        if (optimisticEntries.length === 0) return overlay;

        return {
            ...(overlay ?? { plaidTransactionId: plaidTransactionId ?? "" }),
            ...optimisticFields,
        };
    }, [optimisticFields, overlay, plaidTransactionId]);

    // Stabilized because the notes editor autosave effect depends on this callback.
    const upsertField = useCallback(
        async (field: OverlayField, value: string | null) => {
            if (!plaidTransactionId) return;
            const optimisticValue = value ?? undefined;
            setOptimisticFields((current) => ({
                ...current,
                [field]: optimisticValue,
            }));
            setSavingField(field);
            try {
                await upsertFieldMutation({ plaidTransactionId, field, value });
            } catch (error) {
                setOptimisticFields((current) => {
                    if (current[field] !== optimisticValue) {
                        return current;
                    }
                    const next = { ...current };
                    delete next[field];
                    return next;
                });
                throw error;
            } finally {
                setSavingField(null);
            }
        },
        [plaidTransactionId, upsertFieldMutation],
    );

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
        overlay: resolvedOverlay,
        isLoading: plaidTransactionId !== null && overlay === undefined,
        savingField,
        upsertField,
        toggleReviewed,
        toggleHidden,
    };
}
