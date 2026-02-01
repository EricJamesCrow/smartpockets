"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

interface UseToggleCardLockedOptions {
  onSuccess?: (result: { isLocked: boolean; lockedAt?: number }) => void;
  onError?: (error: Error) => void;
}

interface UseToggleCardLockedReturn {
  /** Lock a credit card */
  lock: (cardId: Id<"creditCards">) => Promise<void>;
  /** Unlock a credit card */
  unlock: (cardId: Id<"creditCards">) => Promise<void>;
  /** Toggle the lock state of a credit card */
  toggle: (cardId: Id<"creditCards">, currentlyLocked: boolean) => Promise<void>;
  /** Whether the mutation is currently running */
  isLoading: boolean;
  /** The last error that occurred */
  error: Error | null;
}

/**
 * Hook for toggling credit card lock status
 *
 * Wraps the Convex mutation with loading state management and error handling.
 *
 * @param options - Optional callbacks for success and error handling
 * @returns Object with lock, unlock, toggle functions and loading/error state
 *
 * @example
 * ```tsx
 * function LockButton({ cardId, isLocked }: { cardId: Id<"creditCards">; isLocked: boolean }) {
 *   const { toggle, isLoading } = useToggleCardLocked({
 *     onSuccess: (result) => toast.success(result.isLocked ? "Card locked" : "Card unlocked"),
 *     onError: (error) => toast.error(error.message),
 *   });
 *
 *   return (
 *     <button onClick={() => toggle(cardId, isLocked)} disabled={isLoading}>
 *       {isLocked ? "Unlock" : "Lock"}
 *     </button>
 *   );
 * }
 * ```
 */
export function useToggleCardLocked(
  options: UseToggleCardLockedOptions = {}
): UseToggleCardLockedReturn {
  const { onSuccess, onError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const toggleLockMutation = useMutation(api.creditCards.mutations.toggleLock);

  const lock = useCallback(
    async (cardId: Id<"creditCards">) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await toggleLockMutation({ cardId, isLocked: true });
        onSuccess?.(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [toggleLockMutation, onSuccess, onError]
  );

  const unlock = useCallback(
    async (cardId: Id<"creditCards">) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await toggleLockMutation({ cardId, isLocked: false });
        onSuccess?.(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [toggleLockMutation, onSuccess, onError]
  );

  const toggle = useCallback(
    async (cardId: Id<"creditCards">, currentlyLocked: boolean) => {
      if (currentlyLocked) {
        await unlock(cardId);
      } else {
        await lock(cardId);
      }
    },
    [lock, unlock]
  );

  return {
    lock,
    unlock,
    toggle,
    isLoading,
    error,
  };
}
