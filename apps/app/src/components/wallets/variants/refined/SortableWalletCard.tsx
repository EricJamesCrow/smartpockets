// apps/app/src/components/wallets/variants/refined/SortableWalletCard.tsx
"use client";

import { cx } from "@repo/ui/utils";
import { useSortableWallet, type WalletCardProps } from "../../shared";
import { WalletCard } from "./WalletCard";

/**
 * Drag-and-drop wrapper for the Refined Materiality wallet card.
 * Renders a hairline champagne grip on the left edge, visible on hover.
 */
export function SortableWalletCard(props: WalletCardProps) {
  const { attributes, listeners, setNodeRef, style, isDragging } =
    useSortableWallet(props.wallet._id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(
        "group relative",
        isDragging && "z-50 opacity-90 shadow-xl"
      )}
    >
      {/* hairline grip on left edge */}
      <div
        {...attributes}
        {...listeners}
        className={cx(
          "absolute -left-1 top-1/2 z-10 h-7 w-0.5 -translate-y-1/2 cursor-grab rounded-r",
          "opacity-0 transition-opacity group-hover:opacity-100",
          isDragging && "cursor-grabbing opacity-100"
        )}
        style={{ background: "rgba(212,197,156,0.5)" }}
        aria-label="Drag to reorder"
      />
      <WalletCard {...props} />
    </div>
  );
}
