"use client";

import { Moon01, Sun } from "@untitledui/icons";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) {
        return (
            <button
                type="button"
                disabled
                className="rounded-md border border-secondary px-3 py-1.5 text-xs text-tertiary"
            >
                Theme
            </button>
        );
    }

    const isDark = resolvedTheme === "dark";
    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex items-center gap-2 rounded-md border border-secondary px-3 py-1.5 text-xs font-medium text-secondary hover:bg-secondary/40"
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon01 className="h-4 w-4" />}
            <span>{isDark ? "dark" : "light"}</span>
        </button>
    );
}
