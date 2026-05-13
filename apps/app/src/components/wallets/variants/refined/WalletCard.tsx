// apps/app/src/components/wallets/variants/refined/WalletCard.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Pin01, Edit03, Trash01 } from "@untitledui/icons";
import { Dropdown } from "@repo/ui/untitledui/base/dropdown/dropdown";
import { cx } from "@repo/ui/utils";
import {
  useWalletCard,
  useWalletCardActions,
  type WalletCardProps,
} from "../../shared";
import { MiniCardPreview } from "./MiniCardPreview";
import { ExtendedStats } from "./ExtendedStats";
import { GRAIN_SVG_URL } from "./grain.svg";

/**
 * Refined Materiality wallet card. In palette, restrained luxury.
 * - Graphite holder with SVG feTurbulence grain at ~10% opacity
 * - Champagne credit-card slot inside (200x120, aspect 1.667)
 * - Hairline champagne edge highlight on top
 * - Champagne ribbon descending from the top edge when pinned
 * - Geist sans typography
 */
export function WalletCard({ wallet, isExtended }: WalletCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editName, setEditName] = useState(wallet.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const { previewCards, walletStats } = useWalletCard(wallet._id, isExtended);
  const actions = useWalletCardActions(wallet._id);

  const handleClick = () => {
    if (!isRenaming) actions.navigateToCards();
  };

  const handleRename = () => {
    setEditName(wallet.name);
    setIsRenaming(true);
  };

  const handleRenameSubmit = async () => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== wallet.name) {
      await actions.rename(trimmedName);
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

  // previewCards from useWalletCard has shape { walletCardId, sortOrder, addedAt, card }
  // MiniCardPreview expects the flat card shape, so flatten here.
  const flatPreviewCards = previewCards.map((p) => p.card);

  return (
    <motion.div
      data-testid="wallet-card"
      data-variant="refined"
      className="group relative cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
    >
      {/* Holder — graphite with grain + hairline top edge */}
      <motion.div
        className="relative overflow-hidden rounded-3xl"
        style={{
          background: "linear-gradient(160deg, #1f1c17 0%, #15130f 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(212,197,156,0.18), inset 0 0 0 1px rgba(212,197,156,0.05), 0 24px 50px rgba(0,0,0,0.55)",
        }}
        animate={{
          boxShadow: isHovered
            ? "inset 0 1px 0 rgba(212,197,156,0.28), inset 0 0 0 1px rgba(212,197,156,0.08), 0 28px 56px rgba(0,0,0,0.6)"
            : "inset 0 1px 0 rgba(212,197,156,0.18), inset 0 0 0 1px rgba(212,197,156,0.05), 0 24px 50px rgba(0,0,0,0.55)",
        }}
      >
        {/* grain overlay */}
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url("${GRAIN_SVG_URL}")`,
            opacity: 0.10,
            mixBlendMode: "overlay",
          }}
        />
        {/* hairline top edge */}
        <span
          className="pointer-events-none absolute left-0 right-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(212,197,156,0.45), transparent)",
          }}
        />
        {/* champagne ribbon when pinned */}
        {wallet.isPinned && (
          <span
            className="pointer-events-none absolute right-6 top-0 h-1.5 w-6 rounded-b-sm"
            style={{
              background: "linear-gradient(180deg, #d4c59c, #a89968)",
              boxShadow: "0 1px 6px rgba(212,197,156,0.45)",
            }}
            aria-label="Pinned"
          />
        )}
        <div className="relative">
          <MiniCardPreview cards={flatPreviewCards} isHovered={isHovered} />
        </div>

        {/* Wallet info row */}
        <div className="relative z-10 flex items-start justify-between px-5 pb-4 pt-1">
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
                  className="w-full min-w-0 rounded border bg-transparent px-1.5 py-0.5 font-medium outline-none ring-2 focus-visible:ring-[#d4c59c]/30"
                  style={{
                    borderColor: "rgba(212,197,156,0.5)",
                    color: "#f0e8d0",
                  }}
                />
              ) : (
                <h3
                  className="truncate font-medium"
                  style={{
                    color: "#f0e8d0",
                    fontFamily: "ui-sans-serif, system-ui, sans-serif",
                    fontSize: 19,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {wallet.name}
                </h3>
              )}
              {wallet.isPinned && !isRenaming && (
                <Pin01 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#d4c59c" }} />
              )}
            </div>
            <p
              className="mt-0.5 text-[10px] uppercase"
              style={{
                color: "rgba(212,197,156,0.6)",
                letterSpacing: "0.16em",
              }}
            >
              {wallet.cardCount} {wallet.cardCount === 1 ? "card" : "cards"}
              {wallet.isPinned ? " · pinned" : ""}
            </p>
          </div>

          <span onClick={(e) => e.stopPropagation()} className="flex items-center">
            <Dropdown.Root>
              <Dropdown.DotsButton
                className="opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Options"
              />
              <Dropdown.Popover className="w-min">
                <Dropdown.Menu>
                  <Dropdown.Item icon={Edit03} onAction={handleRename}>
                    <span className="pr-4">Rename</span>
                  </Dropdown.Item>
                  <Dropdown.Item icon={Pin01} onAction={actions.togglePin}>
                    <span className="pr-4">
                      {wallet.isPinned ? "Unpin from Sidebar" : "Pin to Sidebar"}
                    </span>
                  </Dropdown.Item>
                  <Dropdown.Item
                    icon={Trash01}
                    onAction={() => {
                      if (
                        confirm(`Delete "${wallet.name}"? Cards will not be deleted.`)
                      ) {
                        actions.remove();
                      }
                    }}
                  >
                    <span className="pr-4 text-error-primary">Delete</span>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.Root>
          </span>
        </div>
      </motion.div>

      <ExtendedStats isExtended={isExtended} walletStats={walletStats} />
    </motion.div>
  );
}
