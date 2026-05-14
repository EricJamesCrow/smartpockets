// apps/app/src/components/wallets/shared/use-wallet-card.ts
"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Data hook for a single wallet card.
 *
 * Returns the wallet's first 3 cards (for the mini-stack preview) and
 * optionally the wallet's financial stats when extended view is on.
 */
export function useWalletCard(walletId: Id<"wallets">, isExtended: boolean) {
  const walletWithCards = useQuery(api.wallets.queries.getWithCards, {
    walletId,
  });

  const walletStats = useQuery(
    api.wallets.queries.get,
    isExtended ? { walletId } : "skip"
  );

  const previewCards = walletWithCards?.cards.slice(0, 3) ?? [];

  return { previewCards, walletStats };
}
