"use client";

import type { ReactNode } from "react";
import { Plus } from "@untitledui/icons";
import { Button } from "@repo/ui/untitledui/base/buttons/button";

interface CreditCardsHeaderProps {
  walletName?: string;
  /** Add credit card action rendered in the header actions area */
  addCreditCardAction?: ReactNode;
  /** Callback to open Add Cards slideout (only shown when walletName is set) */
  onAddCardsToWallet?: () => void;
}

/**
 * Header component for the credit cards page
 *
 * Shows "Credit Cards" by default, or the wallet name when filtering by wallet.
 * When viewing a wallet, shows an "Add Cards" button.
 */
export function CreditCardsHeader({
  walletName,
  addCreditCardAction,
  onAddCardsToWallet,
}: CreditCardsHeaderProps) {
  const showWalletAddCards = Boolean(walletName && onAddCardsToWallet);

  return (
    <div className="flex items-center justify-between border-b border-secondary px-6 py-4">
      <div>
        <h1 className="text-display-xs font-semibold text-primary">
          {walletName ? walletName : "Credit Cards"}
        </h1>
        <p className="text-sm text-tertiary">
          {walletName
            ? "Cards in this wallet"
            : "Track your balances, payments, and utilization"}
        </p>
      </div>
      {(addCreditCardAction || showWalletAddCards) && (
        <div className="flex items-center gap-3">
          {addCreditCardAction}
          {/* Add Cards button - only shown when viewing a wallet */}
          {showWalletAddCards && (
            <Button
              color="primary"
              size="sm"
              iconLeading={Plus}
              onClick={onAddCardsToWallet}
            >
              Add Cards
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
