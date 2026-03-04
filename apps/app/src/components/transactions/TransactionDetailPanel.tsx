"use client";

import { DialogTrigger } from "react-aria-components";
import { SlideoutMenu } from "@repo/ui/untitledui/application/slideout-menus/slideout-menu";
import { useTransactionOverlay } from "@/hooks/useTransactionOverlay";
import { TransactionDetailHeader } from "./TransactionDetailHeader";
import { TransactionDetailMerchant } from "./TransactionDetailMerchant";
import { TransactionDetailFields } from "./TransactionDetailFields";
import { TransactionDetailActions } from "./TransactionDetailActions";

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
                <TransactionDetailMerchant transaction={transaction} />

                <TransactionDetailFields
                  transaction={transaction}
                  overlay={overlay}
                  savingField={savingField}
                  upsertField={upsertField}
                />

                <TransactionDetailActions
                  isHidden={isHidden}
                  savingField={savingField}
                  onToggleHidden={() => toggleHidden(!isHidden)}
                />
              </div>
            </SlideoutMenu.Content>
          </>
        )}
      </SlideoutMenu>
    </DialogTrigger>
  );
}
