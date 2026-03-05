"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { applyBrandColor, removeBrandColor } from "@/utils/brand-colors";

interface AppearanceContextValue {
  brandColor: string | null;
  transparentSidebar: boolean;
}

const AppearanceContext = createContext<AppearanceContextValue>({
  brandColor: null,
  transparentSidebar: true,
});

export function useAppearance() {
  return useContext(AppearanceContext);
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const prefs = useQuery(api.userPreferences.get);
  const { setTheme } = useTheme();
  const [hasAppliedInitialTheme, setHasAppliedInitialTheme] = useState(false);

  useEffect(() => {
    // Wait for preferences to load
    if (prefs === undefined) return;

    const appearance = prefs?.appearance;

    // Apply theme from DB (only on initial load)
    if (appearance?.theme && !hasAppliedInitialTheme) {
      setTheme(appearance.theme);
      setHasAppliedInitialTheme(true);
    }

    // Apply brand color (always sync with DB)
    if (appearance?.brandColor) {
      applyBrandColor(appearance.brandColor);
    } else {
      removeBrandColor();
    }
  }, [prefs, setTheme]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      removeBrandColor();
    };
  }, []);

  const value: AppearanceContextValue = {
    brandColor: prefs?.appearance?.brandColor ?? null,
    transparentSidebar: prefs?.appearance?.transparentSidebar ?? true,
  };

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}
