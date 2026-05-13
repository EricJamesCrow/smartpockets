// apps/app/src/components/wallets/variants/leather/WalletCard.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Edit03, Pin01, Trash01 } from "@untitledui/icons";
import { Dropdown } from "@repo/ui/untitledui/base/dropdown/dropdown";
import {
  useWalletCard,
  useWalletCardActions,
  type WalletCardProps,
} from "../../shared";
import { TiltCard } from "./TiltCard";
import { MiniCardPreview } from "./MiniCardPreview";
import { ExtendedStats } from "./ExtendedStats";

/**
 * Variant A — Literal Leather wallet card.
 *
 * Skeuomorphic cognac-leather bifold. Layers, outside → inside:
 *   1. TiltCard wrapper — ±3° pointer-driven rotateX/rotateY
 *   2. Leather chassis (h-48) — cognac gradient + transparent-textures
 *      leather.png overlay + radial highlights + inset shadows
 *   3. Stitching — 1px dashed inset border in warm tan, inset by 12px
 *   4. Pin foil — champagne radial dot top-right when pinned
 *   5. Mini-card stack — 3 brand cards tucked into the top pocket
 *   6. Name + count row — Fraunces italic debossed, Fraunces small caps
 *
 * The Extended Stats panel slides out below the chassis as a parchment
 * receipt when the page-level Details toggle is on.
 *
 * The flat `previewCards` transform on line ~50 is intentional: the
 * shared `useWalletCard` hook returns the nested `{ walletCardId, …,
 * card }` shape, but `MiniCardPreview` only consumes the flat card. Do
 * not pass `previewCards` directly without `.map((p) => p.card)`.
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
    <div data-testid="wallet-card" data-variant="leather">
      <TiltCard
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        onClick={handleClick}
        className="relative h-48 w-full overflow-hidden rounded-2xl focus-visible:ring-2 focus-visible:ring-amber-200/40"
        style={{
          // Cognac leather: warm brown gradient + the transparent-textures
          // leather PNG overlay + a radial highlight that simulates a
          // top-left soft light source on real leather.
          backgroundColor: "#7a4a25",
          backgroundImage: [
            "radial-gradient(ellipse 320px 180px at 24% 26%, rgba(255,220,170,0.18), transparent 65%)",
            "radial-gradient(ellipse 220px 140px at 78% 78%, rgba(0,0,0,0.32), transparent 65%)",
            "url('/wallet-textures/leather.png')",
            "linear-gradient(160deg, #8b552a 0%, #6a3f1f 100%)",
          ].join(", "),
          backgroundBlendMode: "normal, multiply, overlay, normal",
          boxShadow:
            "inset 0 1px 0 rgba(255,220,170,0.25), inset 0 -2px 6px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.18), 0 20px 38px rgba(0,0,0,0.45)",
        }}
      >
        {/* Inset dashed stitching, 12px inside the chassis edge */}
        <span
          className="pointer-events-none absolute rounded-xl"
          style={{
            inset: 12,
            border: "1px dashed rgba(225,185,140,0.32)",
          }}
          aria-hidden
        />

        {/* Champagne foil pin indicator, top-right */}
        {wallet.isPinned && (
          <span
            className="pointer-events-none absolute right-4 top-4 h-2.5 w-2.5 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #fbe7b8 0%, #d4b876 60%, #8c7140 100%)",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.4)",
            }}
            aria-label="Pinned"
          />
        )}

        {/* Mini-card stack tucked into top pocket */}
        <div className="relative pt-3">
          <MiniCardPreview cards={flatPreviewCards} isHovered={isHovered} />
        </div>

        {/* Wallet name + count row — sits below the cards in the lower
            half of the wallet chassis */}
        <div className="relative z-10 flex items-start justify-between px-5 pb-4">
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
                  className="w-full min-w-0 rounded border bg-transparent px-1.5 py-0.5 font-medium outline-none ring-2 focus-visible:ring-amber-200/40"
                  style={{
                    borderColor: "rgba(225,185,140,0.5)",
                    color: "#fbe7b8",
                    fontFamily: "var(--font-fraunces), Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 21,
                  }}
                />
              ) : (
                <h3
                  className="truncate font-medium"
                  style={{
                    color: "#fbe7b8",
                    fontFamily: "var(--font-fraunces), Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 21,
                    letterSpacing: "-0.005em",
                    textShadow:
                      "0 1px 0 rgba(0,0,0,0.7), 0 -1px 0 rgba(255,210,160,0.1)",
                  }}
                >
                  {wallet.name}
                </h3>
              )}
              {wallet.isPinned && !isRenaming && (
                <Pin01
                  className="h-3.5 w-3.5 flex-shrink-0"
                  style={{ color: "rgba(251,231,184,0.85)" }}
                />
              )}
            </div>
            <p
              className="mt-0.5 text-[10px] uppercase"
              style={{
                color: "rgba(225,185,140,0.72)",
                letterSpacing: "0.28em",
                fontFamily: "var(--font-fraunces), Georgia, serif",
                fontVariantCaps: "small-caps",
                textShadow: "0 1px 0 rgba(0,0,0,0.5)",
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
      </TiltCard>

      <ExtendedStats isExtended={isExtended} walletStats={walletStats} />
    </div>
  );
}
