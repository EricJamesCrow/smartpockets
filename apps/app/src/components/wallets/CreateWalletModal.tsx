"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Wallet02 } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@repo/ui/untitledui/application/modals/modal";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { CloseButton } from "@repo/ui/untitledui/base/buttons/close-button";
import { Input } from "@repo/ui/untitledui/base/input/input";
import { FeaturedIcon } from "@repo/ui/untitledui/foundations/featured-icon/featured-icon";
import { BackgroundPattern } from "@repo/ui/untitledui/shared-assets/background-patterns";
import { cx } from "@repo/ui/utils";

// =============================================================================
// PRESET OPTIONS
// =============================================================================

/**
 * Preset color options for wallets
 * Each color uses Tailwind utility classes for consistent theming
 */
const PRESET_COLORS = [
  { value: "blue", bg: "bg-blue-500", ring: "ring-blue-500" },
  { value: "green", bg: "bg-green-500", ring: "ring-green-500" },
  { value: "purple", bg: "bg-purple-500", ring: "ring-purple-500" },
  { value: "orange", bg: "bg-orange-500", ring: "ring-orange-500" },
  { value: "pink", bg: "bg-pink-500", ring: "ring-pink-500" },
  { value: "teal", bg: "bg-teal-500", ring: "ring-teal-500" },
  { value: "red", bg: "bg-red-500", ring: "ring-red-500" },
  { value: "gray", bg: "bg-gray-500", ring: "ring-gray-500" },
] as const;

/**
 * Preset emoji icons for wallets
 * Curated selection of finance/organization-related emojis
 */
const PRESET_ICONS = [
  "💳", "🏦", "💵", "💰", "🛒", "✈️", "🏠", "🚗",
  "🎓", "💼", "🎁", "🌟", "⭐", "❤️", "🔒", "📊",
] as const;

// =============================================================================
// TYPES
// =============================================================================

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Modal for creating a new wallet
 *
 * Features:
 * - Required wallet name input
 * - Optional color picker with preset colors
 * - Optional icon/emoji picker
 * - Form validation (name required)
 * - Loading state during creation
 */
export function CreateWalletModal({ isOpen, onClose }: CreateWalletModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | undefined>(undefined);
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);

  const createWallet = useMutation(api.wallets.mutations.create);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await createWallet({
        name: name.trim(),
        color,
        icon,
      });
      handleClose();
    } catch (error) {
      console.error("Failed to create wallet:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    // Reset form state
    setName("");
    setColor(undefined);
    setIcon(undefined);
    onClose();
  };

  return (
    <ModalOverlay isOpen={isOpen} onOpenChange={(open) => !open && handleClose()} isDismissable>
      <Modal>
        <Dialog>
          <div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl sm:max-w-100">
            {/* Close button */}
            <CloseButton
              onClick={handleClose}
              theme="light"
              size="lg"
              className="absolute right-3 top-3"
            />

            {/* Header with icon */}
            <div className="flex flex-col gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
              <div className="relative w-max">
                <FeaturedIcon color="brand" size="lg" theme="light" icon={Wallet02} />
                <BackgroundPattern
                  pattern="circle"
                  size="sm"
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                />
              </div>
              <div className="z-10 flex flex-col gap-0.5">
                <AriaHeading slot="title" className="text-md font-semibold text-primary">
                  Create Wallet
                </AriaHeading>
                <p className="text-sm text-tertiary">
                  Organize your credit cards into custom collections
                </p>
              </div>
            </div>

            {/* Form content */}
            <div className="mt-5 flex flex-col gap-5 px-4 sm:px-6">
              {/* Name Input */}
              <Input
                label="Wallet Name"
                placeholder="e.g., Travel Cards, Daily Spending"
                value={name}
                onChange={setName}
                isRequired
                autoFocus
                size="md"
              />

              {/* Color Picker */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-primary">
                  Color <span className="text-tertiary">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={cx(
                        "h-8 w-8 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                        c.bg,
                        color === c.value
                          ? `ring-2 ${c.ring} ring-offset-2 ring-offset-bg-primary`
                          : "hover:scale-110"
                      )}
                      onClick={() => setColor(color === c.value ? undefined : c.value)}
                      aria-label={`Select ${c.value} color`}
                      aria-pressed={color === c.value}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-primary">
                  Icon <span className="text-tertiary">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={cx(
                        "flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                        icon === emoji
                          ? "bg-brand-primary/10 ring-2 ring-brand"
                          : "bg-secondary hover:bg-tertiary"
                      )}
                      onClick={() => setIcon(icon === emoji ? undefined : emoji)}
                      aria-label={`Select ${emoji} icon`}
                      aria-pressed={icon === emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="z-10 flex flex-1 flex-col-reverse gap-3 p-4 pt-6 *:grow sm:grid sm:grid-cols-2 sm:px-6 sm:pb-6 sm:pt-8">
              <Button color="secondary" size="lg" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                size="lg"
                onClick={handleCreate}
                isLoading={isCreating}
                isDisabled={!name.trim()}
              >
                Create Wallet
              </Button>
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
