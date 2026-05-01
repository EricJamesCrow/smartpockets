"use client";

import { ThemeProvider } from "next-themes";

/**
 * Theme provider — defaults to dark mode for the moss + champagne aesthetic.
 *
 * AppearanceProvider can still override the theme on initial load from the
 * user's stored preference, and the user can toggle from /settings/appearance.
 * enableSystem stays on so users who have it set to "system" still get OS sync.
 */
export function Theme({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            value={{ light: "light-mode", dark: "dark-mode" }}
            defaultTheme="dark"
            enableSystem
        >
            {children}
        </ThemeProvider>
    );
}
