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
 * Header component for the credit cards page.
 *
 * 2B variant: condensed display title, monospace eyebrow with live-data
 * pulse-dot. Title goes UPPERCASE in IBM Plex Sans Condensed, supporting
 * copy stays in Geist for prose readability.
 */
export function CreditCardsHeader({
  walletName,
  addCreditCardAction,
  onAddCardsToWallet,
}: CreditCardsHeaderProps) {
  const showWalletAddCards = Boolean(walletName && onAddCardsToWallet);

  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
      <div className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-500">
          <span className="size-1.5 animate-pulse rounded-full bg-brand-400 shadow-[0_0_10px_rgba(60,203,127,0.7)]" />
          {walletName ? "WALLET / VIEW" : "CARDS / LEDGER"}
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold uppercase leading-[0.95] tracking-tight text-zinc-50 lg:text-[34px]">
          {walletName ?? "Credit Cards"}
        </h1>
        <p className="text-sm text-zinc-400">
          {walletName
            ? "Cards in this wallet"
            : "Track your balances, payments, and utilization"}
        </p>
      </div>
      {(addCreditCardAction || showWalletAddCards) && (
        <div className="flex items-center gap-3">
          {addCreditCardAction}
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
