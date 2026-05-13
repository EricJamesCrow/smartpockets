// apps/app/src/components/wallets/variants/champagne-leather/SortableWalletCard.tsx
"use client";

import { cx } from "@repo/ui/utils";
import { useSortableWallet, type WalletCardProps } from "../../shared";
import { WalletCard } from "./WalletCard";

/**
 * Drag-and-drop wrapper for the Champagne Leather wallet card.
 *
 * Drag affordance is a subtle vertical grip on the left edge — dark-ink
 * gradient with cream highlight stitches at top and bottom, so it reads
 * as a debossed groove rather than a contrasting strip. Hidden at rest
 * (`opacity-0`), fades in on parent hover, stays visible during an active
 * drag.
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
      {/* Subtle leather grip in dark ink */}
      <div
        {...attributes}
        {...listeners}
        className={cx(
          "absolute -left-2 top-1/2 z-20 h-9 w-1.5 -translate-y-1/2 cursor-grab rounded-r",
          "opacity-0 transition-opacity group-hover:opacity-100",
          isDragging && "cursor-grabbing opacity-100",
        )}
        style={{
          background:
            "linear-gradient(90deg, rgba(80,65,30,0.5), transparent)",
          boxShadow: "inset 0 1px 0 rgba(255,245,215,0.3)",
        }}
        aria-label="Drag to reorder"
      >
        <span
          className="pointer-events-none absolute left-0.5 right-0.5 h-px"
          style={{ top: 8, background: "rgba(80,65,30,0.5)" }}
        />
        <span
          className="pointer-events-none absolute left-0.5 right-0.5 h-px"
          style={{ bottom: 8, background: "rgba(80,65,30,0.5)" }}
        />
      </div>
      <WalletCard {...props} />
    </div>
  );
}
