"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";

interface UseDisconnectPlaidItemOptions {
  onSuccess?: () => void | Promise<void>;
  onError?: (error: Error) => void;
}

interface UseDisconnectPlaidItemReturn {
  /** Disconnect (delete) a plaidItem */
  disconnect: (plaidItemId: string) => Promise<void>;
  /** Whether the mutation is currently running */
  isLoading: boolean;
  /** The last error that occurred */
  error: Error | null;
}

/**
 * Hook for disconnecting (deleting) a Plaid item.
 *
 * Handles CASCADE deletion of all associated data (accounts, transactions, liabilities, credit cards).
 * Provides automatic toast notifications.
 *
 * NOTE: The plaidItemId is a string (component ID), not a Convex Id<"plaidItems">.
 *
 * @example
 * ```tsx
 * const { disconnect, isLoading } = useDisconnectPlaidItem({
 *   onSuccess: () => {
 *     onOpenChange(false); // Close modal
 *     router.push("/settings/integrations"); // Navigate away
 *   },
 * });
 *
 * <Button
 *   onClick={() => disconnect(item._id)}
 *   isDisabled={isLoading}
 *   color="primary-destructive"
 * >
 *   {isLoading ? "Disconnecting..." : "Disconnect"}
 * </Button>
 * ```
 */
export function useDisconnectPlaidItem(
  options: UseDisconnectPlaidItemOptions = {}
): UseDisconnectPlaidItemReturn {
  const { onSuccess, onError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteMutation = useMutation(api.items.mutations.deletePlaidItem);

  const disconnect = async (plaidItemId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteMutation({ plaidItemId });

      toast.success("Bank disconnected", {
        description: "All associated data has been removed.",
      });

      await onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      toast.error("Failed to disconnect institution", {
        description: error.message || "Please try again.",
      });

      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    disconnect,
    isLoading,
    error,
  };
}
