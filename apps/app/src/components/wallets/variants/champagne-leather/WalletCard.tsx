// apps/app/src/components/wallets/variants/champagne-leather/WalletCard.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Edit03, Pin01, Trash01 } from "@untitledui/icons";
import { Dropdown } from "@repo/ui/untitledui/base/dropdown/dropdown";
import {
  useWalletCard,
  useWalletCardActions,
  type WalletCardProps,
} from "../../shared";
import { MiniCardPreview } from "./MiniCardPreview";
import { ExtendedStats } from "./ExtendedStats";
import { TiltCard } from "./TiltCard";

/**
 * Variant C — Champagne Leather wallet card.
 *
 * Hybrid of Variant A (leather metaphor) and Variant B (champagne palette
 * discipline). Same skeuomorphic bifold shape as A — stitched chassis,
 * cards tucked into the top, dark-ink Fraunces italic name with foil-emboss
 * highlight — but recolored to the app's champagne tonality.
 *
 * Key differences from Variant A:
 *   - 2 cards peek (vs A's 3) — more restrained
 *   - Tilt amplitude 2° (vs A's 3°)
 *   - Dark-ink stitching at 35% (vs A's warm-tan)
 *   - Lighter champagne pin dot (more cream/pearl)
 *   - Receipt panel uses the champagne-grain material (vs A's parchment)
 *
 * The `previewCards` transform on line ~50 is intentional: the shared
 * `useWalletCard` hook returns the nested `{ walletCardId, …, card }`
 * shape, but `MiniCardPreview` only consumes the flat card. Do not pass
 * `previewCards` directly without `.map((p) => p.card)`.
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

  // useWalletCard.previewCards has nested shape: `{ walletCardId, ..., card }`.
  // MiniCardPreview expects the flat card — flatten here, never below.
  const flatPreviewCards = previewCards.map((p) => p.card);
  const isEmpty = flatPreviewCards.length === 0;

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
      data-variant="champagne-leather"
      className="group relative cursor-pointer pt-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <TiltCard maxTilt={2}>
        <div
          className="relative h-48 overflow-hidden rounded-2xl"
          style={{
            // Champagne leather: warm tonal gradient + leather PNG via
            // `background-blend-mode: overlay` to keep the grain subtle.
            // Radial highlight simulates top-left soft light.
            backgroundImage:
              "url('/wallet-textures/leather.png'), radial-gradient(ellipse at 30% 25%, rgba(255,245,210,0.18), transparent 60%), linear-gradient(135deg, #d4c59c 0%, #b8a878 60%, #8c7e54 100%)",
            backgroundBlendMode: "overlay, normal, normal",
            boxShadow:
              "inset 0 1px 0 rgba(255,245,215,0.55), inset 0 -3px 10px rgba(50,40,20,0.35), inset 0 0 50px rgba(80,65,30,0.15), 0 22px 50px rgba(0,0,0,0.55), 0 6px 14px rgba(0,0,0,0.4)",
          }}
        >
          {/* Dashed stitching — dark ink at 35% opacity, visible but quiet */}
          <span
            className="pointer-events-none absolute inset-3 rounded-xl"
            style={{
              border: "1px dashed rgba(80,65,30,0.35)",
            }}
            aria-hidden
          />

          {!isEmpty && (
            <MiniCardPreview cards={flatPreviewCards} isHovered={isHovered} />
          )}

          {isEmpty && (
            <div className="absolute inset-6 flex items-center justify-center">
              <span
                className="text-sm italic"
                style={{
                  color: "rgba(50,40,20,0.55)",
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  textShadow: "0 1px 0 rgba(255,245,215,0.4)",
                }}
              >
                Empty wallet
              </span>
            </div>
          )}

          {/* Champagne metal-foil pin dot — lighter than A (more cream/pearl) */}
          {wallet.isPinned && (
            <span
              className="pointer-events-none absolute right-6 top-6 h-2.5 w-2.5 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, #fffaeb, #c4b287)",
                boxShadow:
                  "0 1px 3px rgba(50,40,20,0.4), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(0,0,0,0.2)",
              }}
              aria-label="Pinned"
            />
          )}

          {/* Wallet name + count row — dark-ink Fraunces italic with foil-emboss text-shadow */}
          <div className="absolute bottom-4 left-5 right-5 flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {wallet.icon && (
                  <span className="text-lg" aria-hidden>
                    {wallet.icon}
                  </span>
                )}
                {isRenaming ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={handleRenameKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full min-w-0 rounded border bg-transparent px-1.5 py-0.5 italic outline-none focus-visible:ring-2 focus-visible:ring-amber-900/30"
                    style={{
                      borderColor: "rgba(80,65,30,0.5)",
                      color: "#2a2218",
                      fontFamily: "var(--font-fraunces), Georgia, serif",
                      fontSize: 22,
                    }}
                  />
                ) : (
                  <h3
                    className="truncate"
                    style={{
                      color: "#2a2218",
                      fontFamily: "var(--font-fraunces), Georgia, serif",
                      fontStyle: "italic",
                      fontSize: 22,
                      fontWeight: 500,
                      letterSpacing: "0.005em",
                      textShadow:
                        "0 1px 0 rgba(255,245,215,0.5), 0 -1px 0 rgba(80,65,30,0.2)",
                    }}
                  >
                    {wallet.name}
                  </h3>
                )}
                {wallet.isPinned && !isRenaming && (
                  <Pin01
                    className="h-3.5 w-3.5 flex-shrink-0"
                    style={{ color: "rgba(50,40,20,0.75)" }}
                  />
                )}
              </div>
              <p
                className="mt-0.5 text-[10px]"
                style={{
                  color: "rgba(50,40,20,0.6)",
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  fontVariantCaps: "small-caps",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  textShadow: "0 1px 0 rgba(255,245,215,0.3)",
                }}
              >
                {wallet.cardCount} {wallet.cardCount === 1 ? "card" : "cards"}
                {wallet.isPinned ? " · pinned" : ""}
              </p>
            </div>

            {/* Dropdown — same shared structure as the other variants */}
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
        </div>
      </TiltCard>

      <ExtendedStats isExtended={isExtended} walletStats={walletStats} />
    </motion.div>
  );
}
