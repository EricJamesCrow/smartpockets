// apps/app/src/components/wallets/shared/use-sortable-wallet.ts
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Sortable hook for a wallet card. Wraps `useSortable` and pre-computes
 * the inline transform/transition style so the variant component can
 * spread it directly onto the draggable root.
 */
export function useSortableWallet(walletId: Id<"wallets">) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: walletId });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return {
    attributes,
    listeners,
    setNodeRef,
    style,
    isDragging,
  };
}
