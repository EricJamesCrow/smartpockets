"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";

interface UseTogglePlaidItemOptions {
  onSuccess?: (result: { isActive: boolean }) => void;
  onError?: (error: Error) => void;
}

interface UseTogglePlaidItemReturn {
  /** Toggle the active state of a plaidItem */
  toggle: (itemId: string) => Promise<void>;
  /** Whether the mutation is currently running */
  isLoading: boolean;
  /** The last error that occurred */
  error: Error | null;
}

/**
 * Hook for toggling Plaid item active status.
 *
 * Provides clean API for enable/disable functionality with automatic toast notifications.
 * Used to pause/resume syncing for a bank connection.
 *
 * NOTE: The itemId is a string (component ID), not a Convex Id<"plaidItems">.
 *
 * @example
 * ```tsx
 * const { toggle, isLoading } = useTogglePlaidItem();
 *
 * <Toggle
 *   isSelected={item.isActive}
 *   onChange={() => toggle(item._id)}
 *   isDisabled={isLoading}
 * />
 * ```
 */
export function useTogglePlaidItem(
  options: UseTogglePlaidItemOptions = {}
): UseTogglePlaidItemReturn {
  const { onSuccess, onError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const toggleMutation = useMutation(api.plaidComponent.togglePlaidItemActive);

  const toggle = async (itemId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await toggleMutation({ itemId });

      toast.success(
        result.isActive ? "Institution enabled" : "Institution disabled",
        {
          description: result.isActive
            ? "This institution will sync and appear in your data."
            : "This institution is now paused and hidden from your data.",
        }
      );

      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      toast.error("Failed to toggle institution", {
        description: error.message,
      });

      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    toggle,
    isLoading,
    error,
  };
}
