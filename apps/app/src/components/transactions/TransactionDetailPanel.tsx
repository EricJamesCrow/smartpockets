"use client";

import { useEffect, useState } from "react";
import { SlideoutMenu } from "@repo/ui/untitledui/application/slideout-menus/slideout-menu";
import { toast } from "sonner";
import { useTransactionOverlay } from "@/hooks/useTransactionOverlay";
import { TransactionDetailActions } from "./TransactionDetailActions";
import { TransactionDetailAttachments } from "./TransactionDetailAttachments";
import { TransactionDetailFields } from "./TransactionDetailFields";
import { TransactionDetailHeader } from "./TransactionDetailHeader";
import { TransactionDetailMerchant } from "./TransactionDetailMerchant";
import { TransactionDetailSourceCard } from "./TransactionDetailSourceCard";

/**
 * Unified transaction type for the detail panel.
 *
 * Works with both aggregated transactions (transactions page)
 * and credit-card-scoped transactions.
 */
export interface DetailPanelTransaction {
    transactionId: string;
    date: string;
    datetime?: string;
    name: string;
    merchantName: string;
    amount: number; // canonical milliunits
    isoCurrencyCode?: string;
    pending: boolean;
    categoryPrimary?: string;
    category: string;
    merchantEnrichment?: {
        merchantName: string;
        logoUrl?: string;
        confidenceLevel: string;
    } | null;
    sourceInfo?: {
        cardId: string;
        displayName: string;
        lastFour?: string;
        institutionName?: string;
    };
    isRecurring?: boolean;
    recurringFrequency?: string;
}

interface TransactionDetailPanelProps {
    transaction: DetailPanelTransaction | null;
    onClose: () => void;
}

/**
 * Full-featured transaction detail panel with editable fields.
 *
 * Uses controlled SlideoutMenu (same pattern as AddCardsSlideout) so the overlay
 * keeps mounted while `isOpen` becomes false, allowing fade/slide exit animations.
 * `lastTransaction` preserves row content during that exit after the parent clears
 * `transaction`.
 */
export function TransactionDetailPanel({ transaction, onClose }: TransactionDetailPanelProps) {
    const [lastTransaction, setLastTransaction] = useState<DetailPanelTransaction | null>(null);

    useEffect(() => {
        if (transaction) {
            setLastTransaction(transaction);
        }
    }, [transaction]);

    const panelTransaction = transaction ?? lastTransaction;

    const { overlay, savingField, upsertField, toggleReviewed, toggleHidden } = useTransactionOverlay(
        panelTransaction?.transactionId ?? null,
    );

    const handleHide = () => {
        void toggleHidden(true);
        onClose();

        toast("Transaction hidden", {
            action: {
                label: "Undo",
                onClick: () => {
                    void toggleHidden(false);
                },
            },
            duration: 5000,
        });
    };

    const isReviewed = overlay?.isReviewed ?? false;
    const isHidden = overlay?.isHidden ?? false;

    return (
        <SlideoutMenu isOpen={transaction !== null} onOpenChange={(open) => !open && onClose()}>
            {({ close }) =>
                panelTransaction ? (
                    <>
                        <SlideoutMenu.Header onClose={close}>
                            <TransactionDetailHeader
                                isReviewed={isReviewed}
                                isHidden={isHidden}
                                savingField={savingField}
                                onToggleReviewed={() => toggleReviewed(!isReviewed)}
                                onToggleHidden={() => toggleHidden(!isHidden)}
                                onClose={close}
                            />
                        </SlideoutMenu.Header>

                        <SlideoutMenu.Content>
                            <div className="flex flex-col gap-6 py-2">
                                {/* 1. Merchant (logo, name, amount) */}
                                <TransactionDetailMerchant transaction={panelTransaction} />

                                {/* 2. Fields (statement, date+time, category, notes) */}
                                <TransactionDetailFields
                                    transaction={panelTransaction}
                                    overlay={overlay}
                                    savingField={savingField}
                                    upsertField={upsertField}
                                />

                                {/* 3. Source Card */}
                                {panelTransaction.sourceInfo && (
                                    <TransactionDetailSourceCard sourceInfo={panelTransaction.sourceInfo} />
                                )}

                                {/* 4. Attachments */}
                                <TransactionDetailAttachments plaidTransactionId={panelTransaction.transactionId} />

                                {/* 5. Other Options (hide) */}
                                <TransactionDetailActions onHide={handleHide} isHiding={savingField === "isHidden"} />
                            </div>
                        </SlideoutMenu.Content>
                    </>
                ) : null
            }
        </SlideoutMenu>
    );
}
