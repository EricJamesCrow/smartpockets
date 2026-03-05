"use client";

import { DialogTrigger } from "react-aria-components";
import { SlideoutMenu } from "@repo/ui/untitledui/application/slideout-menus/slideout-menu";
import { useTransactionOverlay } from "@/hooks/useTransactionOverlay";
import { TransactionDetailHeader } from "./TransactionDetailHeader";
import { TransactionDetailMerchant } from "./TransactionDetailMerchant";
import { TransactionDetailFields } from "./TransactionDetailFields";
import { TransactionDetailActions } from "./TransactionDetailActions";
import { TransactionDetailSourceCard } from "./TransactionDetailSourceCard";
import { TransactionDetailAttachments } from "./TransactionDetailAttachments";
import { toast } from "sonner";

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
  amount: number;
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
 * Wraps Header, Merchant, Fields, and Actions in a DialogTrigger + SlideoutMenu
 * pattern. All edits are persisted via the transaction overlay system.
 */
export function TransactionDetailPanel({
  transaction,
  onClose,
}: TransactionDetailPanelProps) {
  const {
    overlay,
    savingField,
    upsertField,
    toggleReviewed,
    toggleHidden,
  } = useTransactionOverlay(transaction?.transactionId ?? null);

  if (!transaction) return null;

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
    <DialogTrigger
      isOpen={transaction !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SlideoutMenu>
        {({ close }) => (
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
                <TransactionDetailMerchant transaction={transaction} />

                {/* 2. Fields (statement, date+time, category, notes) */}
                <TransactionDetailFields
                  transaction={transaction}
                  overlay={overlay}
                  savingField={savingField}
                  upsertField={upsertField}
                />

                {/* 3. Source Card */}
                {transaction.sourceInfo && (
                  <TransactionDetailSourceCard
                    sourceInfo={transaction.sourceInfo}
                  />
                )}

                {/* 4. Attachments */}
                <TransactionDetailAttachments
                  plaidTransactionId={transaction.transactionId}
                />

                {/* 5. Other Options (hide) */}
                <TransactionDetailActions
                  onHide={handleHide}
                  isHiding={savingField === "isHidden"}
                />
              </div>
            </SlideoutMenu.Content>
          </>
        )}
      </SlideoutMenu>
    </DialogTrigger>
  );
}
