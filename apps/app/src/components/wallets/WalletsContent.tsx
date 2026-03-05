"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Plus } from "@untitledui/icons";
import { Toggle } from "@repo/ui/untitledui/base/toggle/toggle";
import { SortableWalletCard, WalletCard } from "./WalletCard";
import { CreateWalletModal } from "./CreateWalletModal";

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Main content component for the wallets page
 *
 * Handles:
 * - Wallet grid display with loading and empty states
 * - Extended view toggle for card details
 * - Create wallet modal trigger (placeholder)
 */
export function WalletsContent() {
  const [isExtended, setIsExtended] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const wallets = useQuery(api.wallets.queries.list, {});
  const updateSortOrder = useMutation(api.wallets.mutations.updateSortOrder);
  const isLoading = wallets === undefined;

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

  // Handle drag end - reorder wallets
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && wallets) {
      const oldIndex = wallets.findIndex((w) => w._id === active.id);
      const newIndex = wallets.findIndex((w) => w._id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Optimistically reorder (Convex will handle real update)
        const reorderedIds = arrayMove(
          wallets.map((w) => w._id),
          oldIndex,
          newIndex
        );

        // Persist new order
        await updateSortOrder({
          walletIds: reorderedIds as Id<"wallets">[],
        });
      }
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-secondary px-6 py-4">
        <div>
          <h1 className="text-display-xs font-semibold text-primary">Wallets</h1>
          <p className="text-sm text-tertiary">
            Organize your credit cards into custom groups
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-tertiary">Details</span>
            <Toggle
              isSelected={isExtended}
              onChange={setIsExtended}
              size="sm"
            />
          </div>
          <Button
            color="primary"
            size="md"
            iconLeading={Plus}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Wallet
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <WalletsGridSkeleton />
        ) : wallets.length === 0 ? (
          <EmptyState onCreateClick={() => setIsCreateModalOpen(true)} />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={wallets.map((w) => w._id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {wallets.map((wallet) => (
                  <SortableWalletCard
                    key={wallet._id}
                    wallet={wallet}
                    isExtended={isExtended}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Create Wallet Modal */}
      <CreateWalletModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

// =============================================================================
// SKELETON LOADING STATE
// =============================================================================

/**
 * Skeleton loading state for the wallet grid
 */
function WalletsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="h-48 animate-pulse rounded-xl bg-tertiary/20"
        />
      ))}
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

interface EmptyStateProps {
  onCreateClick: () => void;
}

/**
 * Empty state shown when user has no wallets
 */
function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-secondary/50 p-4">
        <Plus className="h-8 w-8 text-tertiary" />
      </div>
      <h2 className="text-lg font-semibold text-primary">No wallets yet</h2>
      <p className="mt-1 text-sm text-tertiary">
        Create your first wallet to organize your credit cards
      </p>
      <Button
        color="primary"
        size="md"
        className="mt-4"
        onClick={onCreateClick}
      >
        Create Wallet
      </Button>
    </div>
  );
}
