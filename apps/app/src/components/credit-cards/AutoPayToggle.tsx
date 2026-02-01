"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Toggle } from "@repo/ui/untitledui/base/toggle/toggle";
import { cx } from "@repo/ui/utils";

interface AutoPayToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Simple AutoPay toggle
 *
 * Note: This toggle tracks whether the user has AutoPay enabled with their
 * card provider. It does NOT control the actual AutoPay setting - users must
 * enable/disable AutoPay directly with their credit card issuer.
 */
export function AutoPayToggle({
  enabled,
  onToggle,
  isLoading = false,
  className,
}: AutoPayToggleProps) {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <span className="text-sm font-medium text-tertiary">AutoPay</span>
      <Toggle
        isSelected={enabled}
        onChange={onToggle}
        isDisabled={isLoading}
        size="sm"
      />
    </div>
  );
}

/**
 * Hook to manage AutoPay state
 *
 * Uses Convex mutation to persist autopay setting to the database.
 */
export function useAutoPay(cardId: Id<"creditCards"> | null, isAutoPay: boolean) {
  const [isLoading, setIsLoading] = useState(false);
  const toggleAutoPayMutation = useMutation(api.creditCards.mutations.toggleAutoPay);

  const toggle = async (newState: boolean) => {
    if (!cardId) return;
    setIsLoading(true);
    try {
      await toggleAutoPayMutation({ cardId, isAutoPay: newState });
    } finally {
      setIsLoading(false);
    }
  };

  return { enabled: isAutoPay, isLoading, toggle };
}
