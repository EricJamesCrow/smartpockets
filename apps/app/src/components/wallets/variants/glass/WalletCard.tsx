// apps/app/src/components/wallets/variants/glass/WalletCard.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Pin01, Edit03, Trash01 } from "@untitledui/icons";
import { Dropdown } from "@repo/ui/untitledui/base/dropdown/dropdown";
import {
  useWalletCard,
  useWalletCardActions,
  type WalletCardProps,
} from "../../shared";
import { GlassCard } from "./GlassCard";
import { LiquidGlassHover } from "./LiquidGlassHover";
import { MiniCardPreview } from "./MiniCardPreview";
import { ExtendedStats } from "./ExtendedStats";

/**
 * Architectural Glass wallet card.
 *
 * - Default render: pure-CSS Vision-OS GlassCard with backdrop-filter blur
 * - Hover render: temporarily upgrades to `liquid-glass-react` with true
 *   feDisplacementMap + chromatic aberration (Chromium only)
 * - One displacement-instance maximum: only the hovered card mounts
 *   LiquidGlass (enforced by LiquidGlassHover)
 * - Mini-card preview shows 3 translucent inner glass panels (different
 *   from B/E's single hero slot)
 * - Pin indicator is a moss glowing dot (warmer than B's champagne ribbon)
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

  // previewCards from useWalletCard has shape { walletCardId, sortOrder,
  // addedAt, card }. MiniCardPreview expects the flat card shape, so
  // flatten here. (Same transform as Variants B and E.)
  const flatPreviewCards = previewCards.map((p) => p.card);

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

  return (
    <motion.div
      data-testid="wallet-card"
      data-variant="glass"
      className="group relative cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <LiquidGlassHover isHovered={isHovered} cornerRadius={22}>
        <GlassCard>
          {/* moss glowing pin dot */}
          {wallet.isPinned && (
            <span
              className="pointer-events-none absolute right-5 top-5 h-2 w-2 rounded-full"
              style={{
                background: "#7fb89a",
                boxShadow:
                  "0 0 16px rgba(127,184,154,0.95), 0 0 6px rgba(127,184,154,0.6), inset 0 1px 0 rgba(255,255,255,0.4)",
              }}
              aria-label="Pinned"
            />
          )}

          <MiniCardPreview cards={flatPreviewCards} isHovered={isHovered} />

          <div className="relative z-10 flex items-start justify-between px-5 pb-4 pt-4">
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
                    className="w-full min-w-0 rounded border bg-transparent px-1.5 py-0.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                    style={{
                      borderColor: "rgba(255,255,255,0.4)",
                      color: "rgba(255,255,255,0.96)",
                    }}
                  />
                ) : (
                  <h3
                    className="truncate font-medium"
                    style={{
                      color: "rgba(255,255,255,0.96)",
                      fontFamily: "ui-sans-serif, system-ui, sans-serif",
                      fontSize: 20,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {wallet.name}
                  </h3>
                )}
                {wallet.isPinned && !isRenaming && (
                  <Pin01
                    className="h-3.5 w-3.5 flex-shrink-0"
                    style={{ color: "#7fb89a" }}
                  />
                )}
              </div>
              <p
                className="mt-0.5 text-[11px]"
                style={{
                  color: "rgba(255,255,255,0.55)",
                  letterSpacing: "0.08em",
                  fontFamily: "ui-sans-serif, system-ui, sans-serif",
                }}
              >
                {wallet.cardCount} {wallet.cardCount === 1 ? "card" : "cards"}
                {wallet.isPinned ? " · pinned" : ""}
              </p>
            </div>

            <span
              onClick={(e) => e.stopPropagation()}
              className="flex items-center"
            >
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
                        {wallet.isPinned
                          ? "Unpin from Sidebar"
                          : "Pin to Sidebar"}
                      </span>
                    </Dropdown.Item>
                    <Dropdown.Item
                      icon={Trash01}
                      onAction={() => {
                        if (
                          confirm(
                            `Delete "${wallet.name}"? Cards will not be deleted.`,
                          )
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
        </GlassCard>
      </LiquidGlassHover>

      <ExtendedStats isExtended={isExtended} walletStats={walletStats} />
    </motion.div>
  );
}
