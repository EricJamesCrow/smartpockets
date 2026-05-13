// apps/app/src/components/wallets/variants/leather/SortableWalletCard.tsx
"use client";

import { cx } from "@repo/ui/utils";
import { useSortableWallet, type WalletCardProps } from "../../shared";
import { WalletCard } from "./WalletCard";

/**
 * Drag-and-drop wrapper for the Literal Leather wallet card.
 *
 * The drag affordance is a vertical "leather grip" strip on the left
 * edge — a thin warm-tan band textured with the same leather PNG plus a
 * micro inset-shadow so it reads as a stitched/grooved gripping edge.
 * Hidden at rest (`opacity-0`), fades in on parent hover, stays visible
 * during an active drag.
 *
 * The accessibility label "Drag to reorder" matches the smoke spec and
 * the other variants.
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
        isDragging && "z-50 opacity-90 shadow-xl",
      )}
    >
      {/* Leather grip strip on the left edge of the chassis */}
      <div
        {...attributes}
        {...listeners}
        className={cx(
          "absolute -left-1 top-1/2 z-10 h-12 w-1.5 -translate-y-1/2 cursor-grab rounded",
          "opacity-0 transition-opacity group-hover:opacity-100",
          isDragging && "cursor-grabbing opacity-100",
        )}
        style={{
          backgroundColor: "#a06c3a",
          backgroundImage:
            "url('/wallet-textures/leather.png'), linear-gradient(180deg, #b67e44 0%, #7a4a25 100%)",
          backgroundBlendMode: "overlay, normal",
          boxShadow:
            "inset 0 1px 0 rgba(255,220,170,0.35), inset 0 -1px 0 rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.4)",
        }}
        aria-label="Drag to reorder"
      />
      <WalletCard {...props} />
    </div>
  );
}
