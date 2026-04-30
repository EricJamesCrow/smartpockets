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
    <div className="flex items-center justify-between border-b border-secondary px-6 py-5">
      <div>
        {/* Apothecary section label */}
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.22em] uppercase text-text-brand-primary">
            01
          </span>
          <span className="h-px w-10 bg-gradient-to-r from-[var(--apothecary-hairline-strong)] via-[var(--apothecary-champagne-line)] to-transparent" />
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-[0.22em] uppercase text-text-brand-tertiary">
            {walletName ? "wallet view" : "vault"}
          </span>
        </div>
        {/* Headline with one-word italic accent */}
        <h1 className="mt-2 font-[family-name:var(--font-geist)] text-display-xs font-medium tracking-[-0.02em] text-primary">
          {walletName ? (
            walletName
          ) : (
            <>
              <span className="font-[family-name:var(--font-source-serif)] italic font-light text-text-brand-primary">
                Your
              </span>{" "}
              cards
            </>
          )}
        </h1>
        <p className="mt-1.5 font-[family-name:var(--font-geist)] text-sm text-tertiary">
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
