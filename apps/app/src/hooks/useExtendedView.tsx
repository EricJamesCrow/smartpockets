"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from "react";

// =============================================================================
// TYPES
// =============================================================================

interface ExtendedViewContextType {
  /** Whether the extended view is currently enabled */
  isExtended: boolean;
  /** Toggle the extended view on/off */
  toggleExtended: () => void;
  /** Set the extended view to a specific value */
  setExtended: (value: boolean) => void;
}

// =============================================================================
// STORAGE KEY
// =============================================================================

const STORAGE_KEY = "credit-cards-extended-view";

// =============================================================================
// CONTEXT
// =============================================================================

const ExtendedViewContext = createContext<ExtendedViewContextType | undefined>(
  undefined
);

// =============================================================================
// PROVIDER
// =============================================================================

interface ExtendedViewProviderProps {
  children: ReactNode;
  /** Optional initial value (overrides localStorage) */
  defaultValue?: boolean;
}

/**
 * Provider for extended view state
 *
 * Wraps credit card grid components to provide shared extended view state.
 * State is persisted to localStorage for user preference retention.
 */
export function ExtendedViewProvider({
  children,
  defaultValue = false,
}: ExtendedViewProviderProps) {
  const [isExtended, setIsExtended] = useState(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsExtended(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage when changed
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(isExtended));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [isExtended, isHydrated]);

  const toggleExtended = useCallback(() => {
    setIsExtended((prev) => !prev);
  }, []);

  const setExtended = useCallback((value: boolean) => {
    setIsExtended(value);
  }, []);

  return (
    <ExtendedViewContext.Provider
      value={{ isExtended, toggleExtended, setExtended }}
    >
      {children}
    </ExtendedViewContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access extended view state
 *
 * Must be used within an ExtendedViewProvider.
 */
export function useExtendedView(): ExtendedViewContextType {
  const context = useContext(ExtendedViewContext);

  if (context === undefined) {
    throw new Error(
      "useExtendedView must be used within an ExtendedViewProvider"
    );
  }

  return context;
}
