"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import { SHARED_LAYOUT_ANIMATIONS } from "@/lib/constants/animations";

interface SharedLayoutAnimationContextType {
  /** Whether a shared layout animation is currently in progress */
  isAnimating: boolean;
  /** The ID of the card currently being animated (null if not animating) */
  animatingCardId: string | null;
  /** Start a layout animation for a specific card */
  startAnimation: (cardId: string) => void;
  /** End the current layout animation */
  endAnimation: () => void;
}

const SharedLayoutAnimationContext = createContext<
  SharedLayoutAnimationContextType | undefined
>(undefined);

export function SharedLayoutAnimationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingCardId, setAnimatingCardId] = useState<string | null>(null);

  const startAnimation = useCallback((cardId: string) => {
    setIsAnimating(true);
    setAnimatingCardId(cardId);
  }, []);

  const endAnimation = useCallback(() => {
    setIsAnimating(false);
    setAnimatingCardId(null);
  }, []);

  // Auto-cleanup: end animation after timeout to prevent stuck state
  useEffect(() => {
    if (!isAnimating) return;

    const timeout = setTimeout(() => {
      endAnimation();
    }, SHARED_LAYOUT_ANIMATIONS.CLEANUP_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [isAnimating, endAnimation]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      isAnimating,
      animatingCardId,
      startAnimation,
      endAnimation,
    }),
    [isAnimating, animatingCardId, startAnimation, endAnimation]
  );

  return (
    <SharedLayoutAnimationContext.Provider value={value}>
      {children}
    </SharedLayoutAnimationContext.Provider>
  );
}

/**
 * Hook to access shared layout animation state
 * Use this to check if an animation is in progress or to control animations
 */
export function useSharedLayoutAnimation() {
  const context = useContext(SharedLayoutAnimationContext);
  if (context === undefined) {
    throw new Error(
      "useSharedLayoutAnimation must be used within a SharedLayoutAnimationProvider"
    );
  }
  return context;
}
