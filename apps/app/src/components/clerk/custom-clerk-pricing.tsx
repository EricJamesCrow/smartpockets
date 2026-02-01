"use client";

import { PricingTable } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

export function CustomClerkPricing() {
    const { theme, resolvedTheme } = useTheme();

    // Handle theme detection - UntitledUI uses "light-mode" and "dark-mode"
    // but next-themes resolvedTheme gives us "light" or "dark"
    const isDark = resolvedTheme === "dark" ||
        theme === "dark-mode" ||
        (theme === "system" && typeof window !== "undefined" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);

    return (
        <PricingTable
            appearance={{
                baseTheme: isDark ? dark : undefined,
                elements: {
                    // Card styling
                    pricingTableCard: {
                        borderRadius: "16px",
                        border: "1px solid var(--color-border-secondary)",
                        boxShadow: "var(--shadow-lg)",
                    },
                    pricingTableCardTitle: {
                        fontSize: "20px",
                        fontWeight: "600",
                        color: "var(--color-text-primary)",
                    },
                    pricingTableCardDescription: {
                        fontSize: "14px",
                        color: "var(--color-text-tertiary)",
                    },
                    pricingTableCardFee: {
                        fontSize: "36px",
                        fontWeight: "700",
                        color: "var(--color-text-primary)",
                    },
                    pricingTableCardFeePeriod: {
                        color: "var(--color-text-tertiary)",
                    },
                    // Feature list
                    pricingTableCardFeatureList: {
                        color: "var(--color-text-secondary)",
                    },
                    pricingTableCardFeatureListItem: {
                        fontSize: "14px",
                    },
                    // Button styling
                    pricingTableCardAction: {
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "14px",
                    },
                    // Grid layout
                    pricingTable: {
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "24px",
                    },
                },
                variables: {
                    colorPrimary: "#7f56d9", // Brand purple from UntitledUI
                    colorText: "var(--color-text-primary)",
                    colorTextSecondary: "var(--color-text-tertiary)",
                    colorBackground: "var(--color-bg-primary)",
                    borderRadius: "8px",
                },
            }}
        />
    );
}
