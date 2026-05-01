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
    <div className="flex items-center justify-between border-b border-secondary px-6 py-5 dark:border-white/[0.06]">
      <div>
        <p className="font-[family-name:var(--font-geist-mono)] text-[0.65rem] uppercase tracking-[0.24em] text-tertiary dark:text-stone-500">
          <span className="mr-2 inline-block h-1 w-1 -translate-y-0.5 rounded-full bg-[var(--sp-moss-mint)]" />
          {walletName ? "Wallet" : "Section"}
        </p>
        <h1 className="mt-1.5 text-display-xs font-medium leading-tight tracking-[-0.02em] text-primary">
          {walletName ? (
            <span>
              <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-stone-300">{walletName}</em>
            </span>
          ) : (
            <span>
              Credit <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-stone-300">cards</em>
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-tertiary">
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
