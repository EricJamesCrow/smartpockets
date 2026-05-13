// apps/app/src/components/wallets/variants/glass/SortableWalletCard.tsx
"use client";

import { cx } from "@repo/ui/utils";
import { useSortableWallet, type WalletCardProps } from "../../shared";
import { WalletCard } from "./WalletCard";

/**
 * Drag-and-drop wrapper for the Architectural Glass wallet card.
 * Renders a light semi-transparent grip on the left edge, visible on hover.
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
        isDragging && "z-50 opacity-90 shadow-2xl",
      )}
    >
      {/* light semi-transparent grip on left edge */}
      <div
        {...attributes}
        {...listeners}
        className={cx(
          "absolute -left-1 top-1/2 z-20 h-8 w-0.5 -translate-y-1/2 cursor-grab rounded-r",
          "opacity-0 transition-opacity group-hover:opacity-100",
          isDragging && "cursor-grabbing opacity-100",
        )}
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(255,255,255,0.5), transparent)",
        }}
        aria-label="Drag to reorder"
      />
      <WalletCard {...props} />
    </div>
  );
}
