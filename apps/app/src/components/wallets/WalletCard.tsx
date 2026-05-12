"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pin01, Edit03, Trash01, DotsGrid } from "@untitledui/icons";
import { Dropdown } from "@repo/ui/untitledui/base/dropdown/dropdown";
import { cx } from "@repo/ui/utils";
import { formatMoneyFromDollars } from "@/utils/money";

// =============================================================================
// TYPES
// =============================================================================

interface WalletCardProps {
  wallet: {
    _id: Id<"wallets">;
    name: string;
    color?: string;
    icon?: string;
    cardCount: number;
    isPinned: boolean;
  };
  isExtended: boolean;
}

// =============================================================================
// BRAND COLORS
// =============================================================================

/**
 * Brand colors for mini card previews
 * Maps card network brand to gradient and accent colors
 */
const brandColors: Record<string, { bg: string; accent: string }> = {
  visa: { bg: "from-blue-600 to-blue-800", accent: "bg-yellow-400" },
  mastercard: { bg: "from-red-500 to-orange-500", accent: "bg-yellow-500" },
  amex: { bg: "from-slate-600 to-slate-800", accent: "bg-blue-400" },
  discover: { bg: "from-orange-500 to-orange-600", accent: "bg-white" },
  other: { bg: "from-gray-600 to-gray-800", accent: "bg-gray-400" },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Wallet card component for the wallets grid
 *
 * Features:
 * - Card stack visual with 2-3 cards peeking out
 * - Spring animation fanning out on hover
 * - Shows brand colors, names, last 4 digits
 * - Dropdown menu for Rename, Pin/Unpin, Delete
 * - Extended view with financial stats
 * - Color-coded utilization indicator
 *
 * Click navigates to /credit-cards?wallet={walletId}
 */
export function WalletCard({ wallet, isExtended }: WalletCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editName, setEditName] = useState(wallet.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Fetch wallet with cards for preview
  const walletWithCards = useQuery(api.wallets.queries.getWithCards, {
    walletId: wallet._id,
  });

  // Mutations for dropdown actions
  const togglePin = useMutation(api.wallets.mutations.togglePin);
  const removeWallet = useMutation(api.wallets.mutations.remove);
  const renameWallet = useMutation(api.wallets.mutations.rename);

  // Get first 3 cards for stack preview
  const previewCards = walletWithCards?.cards.slice(0, 3) ?? [];

  // Fetch full stats when extended
  const walletStats = useQuery(
    api.wallets.queries.get,
    isExtended ? { walletId: wallet._id } : "skip"
  );

  const handleClick = () => {
    if (!isRenaming) {
      router.push(`/credit-cards?wallet=${wallet._id}`);
    }
  };

  const handleRename = () => {
    setEditName(wallet.name);
    setIsRenaming(true);
  };

  const handleRenameSubmit = async () => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== wallet.name) {
      await renameWallet({ walletId: wallet._id, name: trimmedName });
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setEditName(wallet.name);
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      handleRenameCancel();
    }
  };

  const handleTogglePin = async () => {
    await togglePin({ walletId: wallet._id });
  };

  const handleDelete = async () => {
    if (confirm(`Delete "${wallet.name}"? Cards will not be deleted.`)) {
      await removeWallet({ walletId: wallet._id });
    }
  };

  return (
    <motion.div
      data-testid="wallet-card"
      className="group relative cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Card Stack Container */}
      <div className="relative h-40 w-full">
        {/* Empty state or card stack */}
        {previewCards.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-dashed border-secondary bg-secondary/20">
            <span className="text-sm text-tertiary">Empty wallet</span>
          </div>
        ) : (
          previewCards.map((item, index) => (
            <MiniCreditCard
              key={item.card._id}
              brand={item.card.brand ?? "other"}
              lastFour={item.card.lastFour}
              displayName={item.card.displayName}
              index={index}
              total={previewCards.length}
              isHovered={isHovered}
            />
          ))
        )}
      </div>

      {/* Wallet Info */}
      <div className="mt-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {wallet.icon && <span className="text-lg">{wallet.icon}</span>}
            {isRenaming ? (
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleRenameKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="w-full min-w-0 rounded border border-brand-primary bg-primary px-1.5 py-0.5 font-medium text-primary outline-none ring-2 ring-brand-primary/30"
              />
            ) : (
              <h3 className="truncate font-medium text-primary">{wallet.name}</h3>
            )}
            {wallet.isPinned && !isRenaming && (
              <Pin01 className="h-3.5 w-3.5 flex-shrink-0 text-brand-primary" />
            )}
          </div>
          <p className="text-sm text-tertiary">
            {wallet.cardCount} {wallet.cardCount === 1 ? "card" : "cards"}
          </p>
        </div>

        {/* Dropdown Menu */}
        <span
          onClick={(e) => e.stopPropagation()}
          className="flex items-center"
        >
          <Dropdown.Root>
            <Dropdown.DotsButton className="opacity-0 transition-opacity group-hover:opacity-100" />

            <Dropdown.Popover className="w-min">
              <Dropdown.Menu>
                <Dropdown.Item icon={Edit03} onAction={handleRename}>
                  <span className="pr-4">Rename</span>
                </Dropdown.Item>
                <Dropdown.Item icon={Pin01} onAction={handleTogglePin}>
                  <span className="pr-4">
                    {wallet.isPinned ? "Unpin from Sidebar" : "Pin to Sidebar"}
                  </span>
                </Dropdown.Item>
                <Dropdown.Item icon={Trash01} onAction={handleDelete}>
                  <span className="pr-4 text-error-primary">Delete</span>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
        </span>
      </div>

      {/* Extended Stats */}
      <AnimatePresence>
        {isExtended && walletStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary/50 p-3 text-sm">
              <div>
                <p className="text-tertiary">Total Balance</p>
                <p className="font-medium text-primary">
                  {formatMoneyFromDollars(walletStats.totalBalance)}
                </p>
              </div>
              <div>
                <p className="text-tertiary">Credit Limit</p>
                <p className="font-medium text-primary">
                  {formatMoneyFromDollars(walletStats.totalCreditLimit, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>
              <div>
                <p className="text-tertiary">Available</p>
                <p className="font-medium text-primary">
                  {formatMoneyFromDollars(walletStats.totalAvailableCredit)}
                </p>
              </div>
              <div>
                <p className="text-tertiary">Utilization</p>
                <p
                  className={cx(
                    "font-medium",
                    (walletStats.averageUtilization ?? 0) < 30
                      ? "text-success-primary"
                      : (walletStats.averageUtilization ?? 0) < 70
                        ? "text-warning-primary"
                        : "text-error-primary"
                  )}
                >
                  {(walletStats.averageUtilization ?? 0).toFixed(0)}%
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// MINI CREDIT CARD
// =============================================================================

interface MiniCreditCardProps {
  brand: string;
  lastFour?: string;
  displayName: string;
  index: number;
  total: number;
  isHovered: boolean;
}

/**
 * Mini credit card component for stack preview
 *
 * Shows a simplified card visual with:
 * - Brand-specific gradient background
 * - Accent chip indicator
 * - Card name and last 4 digits (visible on hover)
 * - Stacked positioning with fan-out animation
 */
function MiniCreditCard({
  brand,
  lastFour,
  displayName,
  index,
  total,
  isHovered,
}: MiniCreditCardProps) {
  // Get brand colors with fallback to "other"
  const colors = brandColors[brand] || brandColors.other!;

  // Calculate stack position - cards peek from top
  const stackOffset = index * 12; // vertical offset when stacked
  const hoverOffset = index * 48; // spread out on hover
  const rotation = isHovered ? (index - 1) * 5 : 0; // fan rotation on hover

  return (
    <motion.div
      className={cx(
        "absolute left-0 right-0 h-28 rounded-xl shadow-md",
        "bg-gradient-to-br",
        colors.bg
      )}
      style={{ zIndex: total - index }}
      initial={false}
      animate={{
        y: isHovered ? hoverOffset : stackOffset,
        rotate: rotation,
        scale: isHovered ? 1 : 1 - index * 0.03,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
    >
      {/* Card content - visible on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="flex h-full flex-col justify-between p-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className={cx("h-2 w-8 rounded", colors.accent)} />
            <div className="flex items-end justify-between">
              <span className="max-w-[60%] truncate text-xs font-medium text-white/90">
                {displayName}
              </span>
              {lastFour && (
                <span className="text-xs text-white/70">•••• {lastFour}</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// SORTABLE WALLET CARD WRAPPER
// =============================================================================

/**
 * Sortable wrapper for WalletCard that enables drag-and-drop reordering.
 *
 * Uses @dnd-kit/sortable to make wallet cards draggable in the grid.
 * Shows a drag handle on hover for better discoverability.
 */
export function SortableWalletCard(props: WalletCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.wallet._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(
        "group relative",
        isDragging && "z-50 opacity-90 shadow-xl"
      )}
    >
      {/* Drag handle overlay - visible on hover */}
      <div
        {...attributes}
        {...listeners}
        className={cx(
          "absolute -left-2 top-1/2 z-10 -translate-y-1/2 cursor-grab rounded p-1",
          "bg-secondary/80 opacity-0 transition-opacity",
          "hover:bg-secondary group-hover:opacity-100",
          isDragging && "cursor-grabbing opacity-100"
        )}
        aria-label="Drag to reorder"
      >
        <DotsGrid className="h-4 w-4 text-tertiary" />
      </div>
      <WalletCard {...props} />
    </div>
  );
}
