// apps/app/src/components/wallets/shared/use-wallet-card-actions.ts
"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Action hook for a wallet card. Provides rename, togglePin, remove,
 * and navigate-to-cards callbacks. All four are stable across renders
 * because they're returned directly from `useMutation` / `useRouter`.
 */
export function useWalletCardActions(walletId: Id<"wallets">) {
  const router = useRouter();
  const togglePin = useMutation(api.wallets.mutations.togglePin);
  const removeWallet = useMutation(api.wallets.mutations.remove);
  const renameWallet = useMutation(api.wallets.mutations.rename);

  return {
    navigateToCards: () => router.push(`/credit-cards?wallet=${walletId}`),
    rename: (name: string) => renameWallet({ walletId, name }),
    togglePin: () => togglePin({ walletId }),
    remove: () => removeWallet({ walletId }),
  };
}
