"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, CreditCard01, DotsGrid } from "@untitledui/icons";
import { motion, AnimatePresence } from "motion/react";
import { cx } from "@/utils/cx";

// =============================================================================
// TYPES
// =============================================================================

interface CardPreview {
  _id: Id<"creditCards">;
  displayName: string;
  brand?: "visa" | "mastercard" | "amex" | "discover" | "other";
  lastFour?: string;
  currentBalance?: number;
}

interface PinnedWallet {
  _id: Id<"wallets">;
  _creationTime: number;
  userId: Id<"users">;
  name: string;
  color?: string;
  icon?: string;
  isPinned: boolean;
  sortOrder: number;
  pinnedSortOrder: number;
  cardCount: number;
  cards: CardPreview[];
}

// =============================================================================
// COLOR MAPPING
// =============================================================================

const colorClasses: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
  red: "bg-red-500",
  gray: "bg-gray-500",
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Sidebar section showing pinned wallets with expandable card lists.
 *
 * Only renders if user has pinned wallets. Each wallet can be expanded to show
 * the cards it contains. Clicking the wallet name filters the credit cards page
 * by that wallet. Clicking a card navigates to the card detail page.
 * Supports drag-and-drop reordering of pinned wallets.
 */
export function PinnedWalletsSidebar() {
  const { isAuthenticated } = useConvexAuth();
  const pinnedWallets = useQuery(
    api.wallets.queries.listPinned,
    isAuthenticated ? {} : "skip"
  );
  const updatePinnedSortOrder = useMutation(api.wallets.mutations.updatePinnedSortOrder);

  // DnD sensors with activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end - reorder pinned wallets
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id && pinnedWallets) {
        const oldIndex = pinnedWallets.findIndex((w) => w._id === active.id);
        const newIndex = pinnedWallets.findIndex((w) => w._id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          // Get reordered IDs
          const reorderedIds = arrayMove(
            pinnedWallets.map((w) => w._id),
            oldIndex,
            newIndex
          );

          // Persist new order
          await updatePinnedSortOrder({
            walletIds: reorderedIds as Id<"wallets">[],
          });
        }
      }
    },
    [pinnedWallets, updatePinnedSortOrder]
  );

  // Don't render section if no pinned wallets or loading
  if (!pinnedWallets || pinnedWallets.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-secondary pt-4">
      <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-tertiary">
        Pinned Wallets
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={pinnedWallets.map((w) => w._id)}
          strategy={verticalListSortingStrategy}
        >
          <nav className="space-y-1">
            {pinnedWallets.map((wallet) => (
              <SortablePinnedWalletItem key={wallet._id} wallet={wallet} />
            ))}
          </nav>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// =============================================================================
// WALLET ITEM COMPONENT
// =============================================================================

interface PinnedWalletItemProps {
  wallet: PinnedWallet;
}

/**
 * Sortable wrapper for PinnedWalletItem that enables drag-and-drop reordering.
 */
function SortablePinnedWalletItem({ wallet }: PinnedWalletItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: wallet._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(
        "relative",
        isDragging && "z-50 opacity-90"
      )}
    >
      <PinnedWalletItem wallet={wallet} dragHandleProps={{ ...attributes, ...listeners }} isDragging={isDragging} />
    </div>
  );
}

interface PinnedWalletItemInnerProps extends PinnedWalletItemProps {
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

/**
 * Individual pinned wallet row with expandable card list.
 */
function PinnedWalletItem({ wallet, dragHandleProps, isDragging }: PinnedWalletItemInnerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if this wallet's filter is currently active
  const isActive =
    pathname === "/credit-cards" && searchParams.get("wallet") === wallet._id;

  const handleWalletClick = () => {
    router.push(`/credit-cards?wallet=${wallet._id}`);
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleCardClick = (cardId: Id<"creditCards">) => {
    router.push(`/credit-cards/${cardId}`);
  };

  return (
    <div>
      {/* Wallet Row */}
      <div
        className={cx(
          "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-brand-primary/10 text-brand-primary"
            : "text-secondary hover:bg-secondary hover:text-primary",
          isDragging && "bg-secondary shadow-sm"
        )}
      >
        {/* Drag handle */}
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className={cx(
              "mr-1 cursor-grab rounded p-0.5 opacity-0 transition-opacity hover:bg-tertiary group-hover:opacity-100",
              isDragging && "cursor-grabbing opacity-100"
            )}
            aria-label="Drag to reorder"
          >
            <DotsGrid className="h-3 w-3 text-quaternary" />
          </div>
        )}

        {/* Color dot or Icon */}
        <div className="mr-2 flex h-5 w-5 items-center justify-center">
          {wallet.icon ? (
            <span className="text-base">{wallet.icon}</span>
          ) : wallet.color ? (
            <span
              className={cx(
                "h-2.5 w-2.5 rounded-full",
                colorClasses[wallet.color] ?? "bg-gray-400"
              )}
            />
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
          )}
        </div>

        {/* Wallet name (clickable) */}
        <button
          onClick={handleWalletClick}
          className="flex-1 truncate text-left hover:underline"
        >
          {wallet.name}
        </button>

        {/* Chevron toggle - always show to allow expanding empty wallets */}
        <button
          onClick={handleChevronClick}
          className="ml-2 rounded p-0.5 opacity-0 transition-opacity hover:bg-tertiary group-hover:opacity-100"
          aria-label={isExpanded ? "Collapse cards" : "Expand cards"}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        </button>
      </div>

      {/* Expanded Card List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-7 space-y-0.5 py-1">
              {wallet.cards.length === 0 ? (
                <p className="px-2 py-1.5 text-xs italic text-quaternary">
                  No cards in wallet
                </p>
              ) : (
                wallet.cards.map((card) => (
                  <button
                    key={card._id}
                    onClick={() => handleCardClick(card._id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-tertiary transition-colors hover:bg-secondary hover:text-primary"
                  >
                    <CreditCard01 className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="flex-1 truncate">{card.displayName}</span>
                    {card.lastFour && (
                      <span className="text-quaternary">
                        &bull;&bull;&bull;&bull; {card.lastFour}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
