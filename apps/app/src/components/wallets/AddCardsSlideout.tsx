"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { SlideoutMenu } from "@repo/ui/untitledui/application/slideout-menus/slideout-menu";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Checkbox } from "@repo/ui/untitledui/base/checkbox/checkbox";
import { cx } from "@repo/ui/utils";

// =============================================================================
// TYPES
// =============================================================================

interface AddCardsSlideoutProps {
  walletId: Id<"wallets">;
  walletName: string;
  isOpen: boolean;
  onClose: () => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Slideout panel for adding cards to a wallet
 *
 * Features:
 * - Shows cards not already in the wallet
 * - Select all / individual selection via checkboxes
 * - Bulk add cards to wallet on submit
 * - Loading and empty states
 */
export function AddCardsSlideout({
  walletId,
  walletName,
  isOpen,
  onClose,
}: AddCardsSlideoutProps) {
  const [selectedCards, setSelectedCards] = useState<Set<Id<"creditCards">>>(
    new Set()
  );
  const [isAdding, setIsAdding] = useState(false);

  // Get cards not already in this wallet
  const availableCards = useQuery(
    api.wallets.cardQueries.listNotInWallet,
    isOpen ? { walletId } : "skip"
  );

  const addCards = useMutation(api.wallets.walletCards.addCards);

  const toggleCard = (cardId: Id<"creditCards">) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!availableCards) return;
    if (selectedCards.size === availableCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(availableCards.map((c) => c._id)));
    }
  };

  const handleAddCards = async () => {
    if (selectedCards.size === 0) return;

    setIsAdding(true);
    try {
      await addCards({
        walletId,
        cardIds: Array.from(selectedCards),
      });
      setSelectedCards(new Set());
      onClose();
    } catch (error) {
      console.error("Failed to add cards:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setSelectedCards(new Set());
    onClose();
  };

  const isAllSelected =
    availableCards &&
    availableCards.length > 0 &&
    selectedCards.size === availableCards.length;

  return (
    <SlideoutMenu
      isOpen={isOpen}
      onOpenChange={(open) => !open && handleClose()}
    >
      <SlideoutMenu.Header onClose={handleClose}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-primary">Add Cards</h2>
          <p className="text-sm text-tertiary">
            Select cards to add to &quot;{walletName}&quot;
          </p>
        </div>
      </SlideoutMenu.Header>

      <SlideoutMenu.Content>
        {availableCards === undefined ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-secondary"
              />
            ))}
          </div>
        ) : availableCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-tertiary">
              All your cards are already in this wallet
            </p>
          </div>
        ) : (
          <div>
            {/* Select All */}
            <div className="mb-4 flex items-center gap-3 border-b border-secondary pb-3">
              <Checkbox
                isSelected={isAllSelected ?? false}
                isIndeterminate={
                  selectedCards.size > 0 && selectedCards.size < availableCards.length
                }
                onChange={toggleAll}
              />
              <span className="text-sm font-medium text-primary">
                Select All ({availableCards.length} cards)
              </span>
            </div>

            {/* Card List */}
            <div className="space-y-2">
              {availableCards.map((card) => (
                <label
                  key={card._id}
                  className={cx(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                    selectedCards.has(card._id)
                      ? "border-brand-primary bg-utility-brand-50"
                      : "border-secondary hover:border-tertiary"
                  )}
                >
                  <Checkbox
                    isSelected={selectedCards.has(card._id)}
                    onChange={() => toggleCard(card._id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-primary">
                      {card.displayName}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-tertiary">
                      {card.brand && (
                        <span className="capitalize">{card.brand}</span>
                      )}
                      {card.lastFour && <span>•••• {card.lastFour}</span>}
                    </div>
                  </div>
                  {card.currentBalance !== undefined && (
                    <div className="text-sm font-medium text-primary">
                      ${card.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}
      </SlideoutMenu.Content>

      <SlideoutMenu.Footer className="flex items-center justify-end gap-3">
        <Button color="secondary" size="md" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          color="primary"
          size="md"
          onClick={handleAddCards}
          isLoading={isAdding}
          isDisabled={selectedCards.size === 0}
        >
          Add {selectedCards.size > 0 ? selectedCards.size : ""} Card
          {selectedCards.size !== 1 ? "s" : ""} to Wallet
        </Button>
      </SlideoutMenu.Footer>
    </SlideoutMenu>
  );
}
