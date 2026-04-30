"use client";

import { ThemeProvider } from "next-themes";

/**
 * 2B Bloomberg-Terminal cockpit is dark-only. We lock the default to "dark"
 * and disable system detection so first paint is always the cockpit graphite
 * surface — but we keep next-themes wired so AppearanceProvider can still
 * toggle the .light-mode / .dark-mode class for users who explicitly opt in
 * via /settings/appearance.
 */
export function Theme({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            value={{ light: "light-mode", dark: "dark-mode" }}
            defaultTheme="dark"
            enableSystem={false}
        >
            {children}
        </ThemeProvider>
    );
}
