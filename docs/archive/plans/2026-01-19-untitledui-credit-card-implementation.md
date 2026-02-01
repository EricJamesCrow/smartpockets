# UntitledUI Credit Card Migration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace SmartPockets credit card visuals with native UntitledUI credit card component while preserving all surrounding UX features.

**Architecture:** Copy the full UntitledUI credit card component (13 variants) into packages/ui, create a wrapper that adapts `ExtendedCreditCardData` to UntitledUI props with bank-to-variant mapping, then swap imports in the grid and detail views.

**Tech Stack:** React 19, Tailwind CSS v4, Motion (Framer Motion), UntitledUI components

---

## Task 1: Update UntitledUI Credit Card Component

**Files:**
- Modify: `packages/ui/src/components/untitledui/shared-assets/credit-card/credit-card.tsx`
- Create: `packages/ui/src/components/untitledui/shared-assets/credit-card/icons.tsx`

**Step 1: Create the icons file**

Create `packages/ui/src/components/untitledui/shared-assets/credit-card/icons.tsx`:

```tsx
"use client";

import type { SVGProps } from "react";

export const PaypassIcon = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg width="20" height="24" viewBox="0 0 20 24" fill="none" {...props}>
            <g clipPath="url(#clip0_1307_7682)">
                <path
                    d="M15.1429 1.28571C17.0236 4.54326 18.0138 8.23849 18.0138 12C18.0138 15.7615 17.0236 19.4567 15.1429 22.7143M10.4286 3.64285C11.8956 6.18374 12.6679 9.06602 12.6679 12C12.6679 14.934 11.8956 17.8162 10.4286 20.3571M5.92859 5.80713C6.98933 7.66394 7.54777 9.77022 7.54777 11.9143C7.54777 14.0583 6.98933 16.1646 5.92859 18.0214M1.42859 8.14285C2.19306 9.29983 2.59834 10.6362 2.59834 12C2.59834 13.3638 2.19306 14.7002 1.42859 15.8571"
                    stroke="currentColor"
                    strokeWidth="2.57143"
                    strokeLinecap="round"
                />
            </g>
            <defs>
                <clipPath id="clip0_1307_7682">
                    <rect width="20" height="24" fill="white" />
                </clipPath>
            </defs>
        </svg>
    );
};

export const MastercardIconWhite = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg width="30" height="19" viewBox="0 0 30 19" fill="none" {...props}>
            <path
                opacity="0.5"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.9053 16.4392C13.3266 17.7699 11.2787 18.5733 9.04092 18.5733C4.04776 18.5733 0 14.5737 0 9.63994C0 4.70619 4.04776 0.706604 9.04092 0.706604C11.2787 0.706604 13.3266 1.50993 14.9053 2.84066C16.484 1.50993 18.5319 0.706604 20.7697 0.706604C25.7629 0.706604 29.8106 4.70619 29.8106 9.63994C29.8106 14.5737 25.7629 18.5733 20.7697 18.5733C18.5319 18.5733 16.484 17.7699 14.9053 16.4392Z"
                fill="white"
            />
            <path
                opacity="0.5"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.9053 16.4392C16.8492 14.8007 18.0818 12.3625 18.0818 9.63994C18.0818 6.91733 16.8492 4.47919 14.9053 2.84066C16.484 1.50993 18.5319 0.706604 20.7697 0.706604C25.7628 0.706604 29.8106 4.70619 29.8106 9.63994C29.8106 14.5737 25.7628 18.5733 20.7697 18.5733C18.5319 18.5733 16.484 17.7699 14.9053 16.4392Z"
                fill="white"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.9053 16.4392C16.8492 14.8007 18.0818 12.3625 18.0818 9.63995C18.0818 6.91736 16.8492 4.47924 14.9053 2.8407C12.9614 4.47924 11.7288 6.91736 11.7288 9.63995C11.7288 12.3625 12.9614 14.8007 14.9053 16.4392Z"
                fill="white"
            />
        </svg>
    );
};

export const MastercardIcon = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg width="30" height="19" viewBox="0 0 30 19" fill="none" {...props}>
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.9053 16.4393C13.3266 17.77 11.2787 18.5733 9.04092 18.5733C4.04776 18.5733 0 14.5737 0 9.64C0 4.70625 4.04776 0.706665 9.04092 0.706665C11.2787 0.706665 13.3266 1.51 14.9053 2.84072C16.484 1.51 18.5319 0.706665 20.7697 0.706665C25.7629 0.706665 29.8106 4.70625 29.8106 9.64C29.8106 14.5737 25.7629 18.5733 20.7697 18.5733C18.5319 18.5733 16.484 17.77 14.9053 16.4393Z"
                fill="#ED0006"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.9053 16.4393C16.8492 14.8007 18.0818 12.3626 18.0818 9.64C18.0818 6.91739 16.8492 4.47925 14.9053 2.84072C16.484 1.50999 18.5319 0.706665 20.7697 0.706665C25.7628 0.706665 29.8106 4.70625 29.8106 9.64C29.8106 14.5737 25.7628 18.5733 20.7697 18.5733C18.5319 18.5733 16.484 17.77 14.9053 16.4393Z"
                fill="#F9A000"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.9053 16.4393C16.8492 14.8008 18.0818 12.3627 18.0818 9.64007C18.0818 6.91748 16.8492 4.47936 14.9053 2.84082C12.9614 4.47936 11.7288 6.91748 11.7288 9.64007C11.7288 12.3627 12.9614 14.8008 14.9053 16.4393Z"
                fill="#FF5E00"
            />
        </svg>
    );
};
```

**Step 2: Verify icons file created**

Run: `ls -la packages/ui/src/components/untitledui/shared-assets/credit-card/icons.tsx`
Expected: File exists

**Step 3: Replace credit-card.tsx with full 13-variant version**

Replace `packages/ui/src/components/untitledui/shared-assets/credit-card/credit-card.tsx` with:

```tsx
"use client";

import { useMemo } from "react";
import { cx, sortCx } from "../../../../utils/cx";
import { MastercardIcon, MastercardIconWhite, PaypassIcon } from "./icons";

const styles = sortCx({
    // Normal
    transparent: {
        root: "bg-black/10 bg-linear-to-br from-white/30 to-transparent backdrop-blur-[6px] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
        company: "text-white",
        footerText: "text-white",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white/10",
    },
    "transparent-gradient": {
        root: "bg-black/10 bg-linear-to-br from-white/30 to-transparent backdrop-blur-[6px] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
        company: "text-white",
        footerText: "text-white",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white/10",
    },
    "brand-dark": {
        root: "bg-linear-to-tr from-brand-900 to-brand-700 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
        company: "text-white",
        footerText: "text-white",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white/10",
    },
    "brand-light": {
        root: "bg-brand-100 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-black/10 before:ring-inset",
        company: "text-gray-700",
        footerText: "text-gray-700",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white",
    },
    "gray-dark": {
        root: "bg-linear-to-tr from-gray-900 to-gray-700 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
        company: "text-white",
        footerText: "text-white",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white/10",
    },
    "gray-light": {
        root: "bg-gray-100 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-black/10 before:ring-inset",
        company: "text-gray-700",
        footerText: "text-gray-700",
        paypassIcon: "text-gray-400",
        cardTypeRoot: "bg-white",
    },

    // Strip
    "transparent-strip": {
        root: "bg-linear-to-br from-white/30 to-transparent backdrop-blur-[6px] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
        company: "text-white",
        footerText: "text-white",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white/10",
    },
    "gray-strip": {
        root: "bg-gray-100 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
        company: "text-gray-700",
        footerText: "text-white",
        paypassIcon: "text-gray-400",
        cardTypeRoot: "bg-white/10",
    },
    "gradient-strip": {
        root: "bg-linear-to-b from-[#A5C0EE] to-[#FBC5EC] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
        company: "text-white",
        footerText: "text-white",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white/10",
    },
    "salmon-strip": {
        root: "bg-[#F4D9D0] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
        company: "text-gray-700",
        footerText: "text-white",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white/10",
    },

    // Vertical strip
    "gray-strip-vertical": {
        root: "bg-linear-to-br from-white/30 to-transparent before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
        company: "text-white",
        footerText: "text-white",
        paypassIcon: "text-gray-400",
        cardTypeRoot: "bg-white/10",
    },
    "gradient-strip-vertical": {
        root: "bg-linear-to-b from-[#FBC2EB] to-[#A18CD1] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
        company: "text-white",
        footerText: "text-white",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white/10",
    },
    "salmon-strip-vertical": {
        root: "bg-[#F4D9D0] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
        company: "text-white",
        footerText: "text-white",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white/10",
    },
});

const _NORMAL_TYPES = ["transparent", "transparent-gradient", "brand-dark", "brand-light", "gray-dark", "gray-light"] as const;
const STRIP_TYPES = ["transparent-strip", "gray-strip", "gradient-strip", "salmon-strip"] as const;
const VERTICAL_STRIP_TYPES = ["gray-strip-vertical", "gradient-strip-vertical", "salmon-strip-vertical"] as const;

const CARD_WITH_COLOR_LOGO = ["brand-dark", "brand-light", "gray-dark", "gray-light"] as const;

export type CreditCardType = (typeof _NORMAL_TYPES)[number] | (typeof STRIP_TYPES)[number] | (typeof VERTICAL_STRIP_TYPES)[number];

export interface CreditCardProps {
    company?: string;
    cardNumber?: string;
    cardHolder?: string;
    cardExpiration?: string;
    type?: CreditCardType;
    className?: string;
    width?: number;
}

const calculateScale = (desiredWidth: number, originalWidth: number, originalHeight: number) => {
    const scale = desiredWidth / originalWidth;
    const scaledWidth = originalWidth * scale;
    const scaledHeight = originalHeight * scale;

    return {
        scale: scale.toFixed(4),
        scaledWidth: scaledWidth.toFixed(2),
        scaledHeight: scaledHeight.toFixed(2),
    };
};

export const CreditCard = ({
    company = "Untitled.",
    cardNumber = "1234 1234 1234 1234",
    cardHolder = "OLIVIA RHYE",
    cardExpiration = "06/28",
    type = "brand-dark",
    className,
    width,
}: CreditCardProps) => {
    const originalWidth = 316;
    const originalHeight = 190;

    const { scale, scaledWidth, scaledHeight } = useMemo(() => {
        if (!width)
            return {
                scale: 1,
                scaledWidth: originalWidth,
                scaledHeight: originalHeight,
            };

        return calculateScale(width, originalWidth, originalHeight);
    }, [width]);

    return (
        <div
            style={{
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`,
            }}
            className={cx("relative flex", className)}
        >
            <div
                style={{
                    transform: `scale(${scale})`,
                    width: `${originalWidth}px`,
                    height: `${originalHeight}px`,
                }}
                className={cx("absolute top-0 left-0 flex origin-top-left flex-col justify-between overflow-hidden rounded-2xl p-4", styles[type].root)}
            >
                {/* Horizontal strip */}
                {STRIP_TYPES.includes(type as (typeof STRIP_TYPES)[number]) && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-1/2 bg-gray-800"></div>
                )}
                {/* Vertical stripe */}
                {VERTICAL_STRIP_TYPES.includes(type as (typeof VERTICAL_STRIP_TYPES)[number]) && (
                    <div className="pointer-events-none absolute inset-y-0 right-22 left-0 z-0 bg-gray-800"></div>
                )}
                {/* Gradient diffusor */}
                {type === "transparent-gradient" && (
                    <div className="absolute -top-4 -left-4 grid grid-cols-2 blur-3xl">
                        <div className="size-20 rounded-tl-full bg-pink-500 opacity-30 mix-blend-normal" />
                        <div className="size-20 rounded-tr-full bg-orange-500 opacity-50 mix-blend-normal" />
                        <div className="size-20 rounded-bl-full bg-blue-500 opacity-30 mix-blend-normal" />
                        <div className="size-20 rounded-br-full bg-success-500 opacity-30 mix-blend-normal" />
                    </div>
                )}

                <div className="relative flex items-start justify-between px-1 pt-1">
                    <div className={cx("text-md leading-[normal] font-semibold", styles[type].company)}>{company}</div>

                    <PaypassIcon className={styles[type].paypassIcon} />
                </div>

                <div className="relative flex items-end justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-2">
                        <div className="flex items-end gap-1">
                            <p
                                style={{
                                    wordBreak: "break-word",
                                }}
                                className={cx("text-xs leading-snug font-semibold tracking-[0.6px] uppercase", styles[type].footerText)}
                            >
                                {cardHolder}
                            </p>
                            <p
                                className={cx(
                                    "ml-auto text-right text-xs leading-[normal] font-semibold tracking-[0.6px] tabular-nums",
                                    styles[type].footerText,
                                )}
                            >
                                {cardExpiration}
                            </p>
                        </div>
                        <div className={cx("text-md leading-[normal] font-semibold tracking-[1px] tabular-nums", styles[type].footerText)}>
                            {cardNumber}

                            {/* Placeholder to always keep space for card number */}
                            <span className="pointer-events-none invisible inline-block w-0 max-w-0 opacity-0">1</span>
                        </div>
                    </div>

                    <div className={cx("flex h-8 w-11.5 shrink-0 items-center justify-center rounded", styles[type].cardTypeRoot)}>
                        {CARD_WITH_COLOR_LOGO.includes(type as (typeof CARD_WITH_COLOR_LOGO)[number]) ? <MastercardIcon /> : <MastercardIconWhite />}
                    </div>
                </div>
            </div>
        </div>
    );
};
```

**Step 4: Verify typecheck passes**

Run: `cd apps/app && bun run typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/ui/src/components/untitledui/shared-assets/credit-card/
git commit -m "feat(ui): add full UntitledUI credit card component with 13 variants

- Add icons.tsx with PaypassIcon, MastercardIcon, MastercardIconWhite
- Update credit-card.tsx with all 13 visual variants
- Export CreditCardType and CreditCardProps types

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Bank-to-Variant Config

**Files:**
- Create: `apps/app/src/components/credit-cards/untitled-card-config.ts`

**Step 1: Create the config file**

Create `apps/app/src/components/credit-cards/untitled-card-config.ts`:

```typescript
/**
 * Bank-to-UntitledUI variant mapping configuration
 *
 * Maps credit card company names to UntitledUI credit card visual variants.
 * Each bank gets a distinct variant for visual differentiation.
 */

import type { CreditCardType } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";

/**
 * Bank name to UntitledUI variant mapping
 *
 * Rationale for each mapping:
 * - Apple: gray-light - Minimalist white/silver aesthetic
 * - Chase: brand-dark - Deep blue brand color, premium feel
 * - Wells Fargo: salmon-strip - Warm red/gold brand colors
 * - Citi: gradient-strip - Modern blue brand with depth
 * - American Express: gray-strip-vertical - Premium vertical accent
 * - Capital One: gradient-strip-vertical - Bold brand with edge
 * - Synchrony: gray-dark - Neutral partner-brand
 */
const bankVariantMap: Record<string, CreditCardType> = {
  apple: "gray-light",
  chase: "brand-dark",
  "wells fargo": "salmon-strip",
  citi: "gradient-strip",
  "american express": "gray-strip-vertical",
  amex: "gray-strip-vertical",
  "capital one": "gradient-strip-vertical",
  synchrony: "gray-dark",
  discover: "brand-light",
  "bank of america": "transparent-strip",
  usaa: "gray-strip",
};

/**
 * Default variant for unknown banks
 * transparent-gradient provides an eye-catching glass effect
 */
export const defaultVariant: CreditCardType = "transparent-gradient";

/**
 * Get the UntitledUI variant for a given card company
 *
 * @param company - The card company/bank name
 * @returns The CreditCardType variant to use
 */
export function getUntitledVariant(company: string): CreditCardType {
  const normalized = company.toLowerCase().trim();

  // Check for exact match first
  if (bankVariantMap[normalized]) {
    return bankVariantMap[normalized];
  }

  // Check for partial match (e.g., "Chase Sapphire" matches "chase")
  for (const [bank, variant] of Object.entries(bankVariantMap)) {
    if (normalized.includes(bank)) {
      return variant;
    }
  }

  return defaultVariant;
}
```

**Step 2: Verify file created**

Run: `ls -la apps/app/src/components/credit-cards/untitled-card-config.ts`
Expected: File exists

**Step 3: Verify typecheck passes**

Run: `cd apps/app && bun run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/app/src/components/credit-cards/untitled-card-config.ts
git commit -m "feat(credit-cards): add bank-to-variant mapping config

Maps bank names to UntitledUI credit card visual variants:
- Apple → gray-light
- Chase → brand-dark
- Wells Fargo → salmon-strip
- Citi → gradient-strip
- American Express → gray-strip-vertical
- Capital One → gradient-strip-vertical
- Default → transparent-gradient

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create UntitledCreditCard Wrapper Component

**Files:**
- Create: `apps/app/src/components/credit-cards/UntitledCreditCard.tsx`

**Step 1: Create the wrapper component**

Create `apps/app/src/components/credit-cards/UntitledCreditCard.tsx`:

```tsx
"use client";

import { CreditCard } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";
import { getUntitledVariant } from "./untitled-card-config";
import type { ExtendedCreditCardData } from "@/types/credit-cards";

interface UntitledCreditCardProps {
  card: ExtendedCreditCardData;
  className?: string;
  width?: number;
}

/**
 * Wrapper component that adapts ExtendedCreditCardData to UntitledUI CreditCard props
 *
 * This component:
 * - Maps the card company to an UntitledUI visual variant
 * - Formats the card number with masked digits
 * - Converts expiry date format if needed
 * - Passes through className and width for layout control
 */
export function UntitledCreditCard({
  card,
  className,
  width,
}: UntitledCreditCardProps) {
  const variant = getUntitledVariant(card.company);

  // Format card number: show only last 4 digits
  const formattedCardNumber = `•••• •••• •••• ${card.lastFour}`;

  return (
    <CreditCard
      company={card.company}
      cardNumber={formattedCardNumber}
      cardHolder={card.cardholderName.toUpperCase()}
      cardExpiration={formatExpiry(card)}
      type={variant}
      className={className}
      width={width}
    />
  );
}

/**
 * Format expiry date for display
 * Handles missing data gracefully
 */
function formatExpiry(card: ExtendedCreditCardData): string {
  // If we have a proper expiry date stored, use it
  // For now, return a placeholder since ExtendedCreditCardData doesn't have expiryDate
  // This can be extended when the data model includes expiry
  return "••/••";
}
```

**Step 2: Verify file created**

Run: `ls -la apps/app/src/components/credit-cards/UntitledCreditCard.tsx`
Expected: File exists

**Step 3: Verify typecheck passes**

Run: `cd apps/app && bun run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/app/src/components/credit-cards/UntitledCreditCard.tsx
git commit -m "feat(credit-cards): add UntitledCreditCard wrapper component

Adapts ExtendedCreditCardData to UntitledUI CreditCard props:
- Maps company to visual variant via getUntitledVariant
- Formats card number with masked digits
- Converts cardholder name to uppercase

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create UntitledCardGridItem Component

**Files:**
- Create: `apps/app/src/components/credit-cards/UntitledCardGridItem.tsx`

**Step 1: Create the grid item component**

Create `apps/app/src/components/credit-cards/UntitledCardGridItem.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { cx } from "@repo/ui/utils";
import { UntitledCreditCard } from "./UntitledCreditCard";
import { UtilizationBar } from "./UtilizationProgress";
import { useSharedLayoutAnimation } from "@/lib/context/shared-layout-animation-context";
import {
  SHARED_LAYOUT_ANIMATIONS,
  CARD_GRID_ANIMATIONS,
} from "@/lib/constants/animations";
import {
  formatApr,
  formatDisplayCurrency,
  formatDueDate,
  type ExtendedCreditCardData,
} from "@/types/credit-cards";

interface UntitledCardGridItemProps {
  card: ExtendedCreditCardData;
  isExtended: boolean;
  className?: string;
}

/**
 * Grid item component using UntitledUI credit card visual
 *
 * Features preserved from original:
 * - Shared element transitions via layoutId
 * - Hover/tap scale animations
 * - Extended details panel
 * - Route prefetching on hover
 */
export function UntitledCardGridItem({
  card,
  isExtended,
  className,
}: UntitledCardGridItemProps) {
  const router = useRouter();
  const { isAnimating, animatingCardId, startAnimation } =
    useSharedLayoutAnimation();

  // Track if this is the initial mount (for stagger animation on first load)
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  useEffect(() => {
    setHasAnimatedIn(true);
  }, []);

  const cardIdStr = card.id as string;
  const isCurrentCard = animatingCardId === cardIdStr;
  const shouldFadeOut = isAnimating && !isCurrentCard;
  const hoverEnabled = !isAnimating;

  // Skip initial animation for shared layout transitions (when navigating back)
  const shouldUseInitial = !hasAnimatedIn && !isAnimating;

  const handleClick = () => {
    startAnimation(cardIdStr);
    router.push(`/credit-cards/${card.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <motion.div
      layout
      layoutId={`card-${cardIdStr}`}
      initial={shouldUseInitial ? { opacity: 0, scale: 0.95 } : false}
      animate={{
        opacity: shouldFadeOut ? SHARED_LAYOUT_ANIMATIONS.FADE_OPACITY : 1,
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={
        hoverEnabled ? { scale: CARD_GRID_ANIMATIONS.HOVER_SCALE } : undefined
      }
      whileTap={
        hoverEnabled ? { scale: CARD_GRID_ANIMATIONS.TAP_SCALE } : undefined
      }
      transition={{
        opacity: { duration: SHARED_LAYOUT_ANIMATIONS.FADE_DURATION },
        layout: {
          type: "spring",
          stiffness: SHARED_LAYOUT_ANIMATIONS.SPRING_STIFFNESS,
          damping: SHARED_LAYOUT_ANIMATIONS.SPRING_DAMPING,
          duration: SHARED_LAYOUT_ANIMATIONS.DURATION,
        },
      }}
      className={cx(
        "group inline-block cursor-pointer",
        isAnimating && !isCurrentCard && "pointer-events-none",
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => router.prefetch(`/credit-cards/${card.id}`)}
      role="button"
      tabIndex={0}
      aria-label={`View ${card.cardName} details`}
    >
      {/* Card Visual - Using UntitledUI component */}
      <UntitledCreditCard card={card} width={280} />

      {/* Extended Details - Only shown when expanded */}
      {isExtended && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-3"
          style={{ width: 280 }}
        >
          {/* Card Name & Company */}
          <div className="mb-2">
            <h3 className="truncate text-sm font-semibold text-primary">
              {card.cardName}
            </h3>
            <p className="text-xs text-tertiary">{card.company}</p>
          </div>

          {/* Utilization Bar */}
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-tertiary">Utilization</span>
              <span className="text-xs font-medium tabular-nums text-primary">
                {card.utilization !== null ? `${card.utilization}%` : "--"}
              </span>
            </div>
            <UtilizationBar utilization={card.utilization} />
          </div>

          {/* APR, Min Payment, Due Date */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-tertiary">APR</p>
              <p className="font-medium text-primary">{formatApr(card.apr)}</p>
            </div>
            <div>
              <p className="text-tertiary">Min Payment</p>
              <p className="font-medium text-primary">
                {formatDisplayCurrency(card.minimumPaymentAmount)}
              </p>
            </div>
            <div>
              <p className="text-tertiary">Due Date</p>
              <p className="font-medium text-primary">
                {card.nextPaymentDueDate
                  ? formatDueDate(card.nextPaymentDueDate)
                  : "--"}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
```

**Step 2: Verify file created**

Run: `ls -la apps/app/src/components/credit-cards/UntitledCardGridItem.tsx`
Expected: File exists

**Step 3: Verify typecheck passes**

Run: `cd apps/app && bun run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/app/src/components/credit-cards/UntitledCardGridItem.tsx
git commit -m "feat(credit-cards): add UntitledCardGridItem component

Grid item using UntitledUI credit card visual with:
- Shared element transitions via layoutId
- Hover/tap scale animations
- Extended details panel (utilization, APR, payment info)
- Route prefetching on hover

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create UntitledCardVisual Component

**Files:**
- Create: `apps/app/src/components/credit-cards/UntitledCardVisual.tsx`

**Step 1: Create the detail view visual component**

Create `apps/app/src/components/credit-cards/UntitledCardVisual.tsx`:

```tsx
"use client";

import { motion } from "motion/react";
import { UntitledCreditCard } from "./UntitledCreditCard";
import { SHARED_LAYOUT_ANIMATIONS } from "@/lib/constants/animations";
import type { ExtendedCreditCardData } from "@/types/credit-cards";

interface UntitledCardVisualProps {
  card: ExtendedCreditCardData;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Detail view wrapper for UntitledUI credit card visual
 *
 * Provides shared element transition from grid view using matching layoutId.
 * Simpler than original since UntitledUI cards are single-sided (no flip).
 */
export function UntitledCardVisual({
  card,
  size = "lg",
  className,
}: UntitledCardVisualProps) {
  const sizeWidths = {
    sm: 240,
    md: 320,
    lg: 400,
  };

  const cardIdStr = card.id as string;

  return (
    <motion.div
      layoutId={`card-${cardIdStr}`}
      layout="position"
      transition={{
        type: "spring",
        stiffness: SHARED_LAYOUT_ANIMATIONS.SPRING_STIFFNESS,
        damping: SHARED_LAYOUT_ANIMATIONS.SPRING_DAMPING,
        duration: SHARED_LAYOUT_ANIMATIONS.DURATION,
      }}
      className={className}
    >
      <UntitledCreditCard card={card} width={sizeWidths[size]} />
    </motion.div>
  );
}
```

**Step 2: Verify file created**

Run: `ls -la apps/app/src/components/credit-cards/UntitledCardVisual.tsx`
Expected: File exists

**Step 3: Verify typecheck passes**

Run: `cd apps/app && bun run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/app/src/components/credit-cards/UntitledCardVisual.tsx
git commit -m "feat(credit-cards): add UntitledCardVisual for detail view

Detail view wrapper with:
- Shared element transition from grid via layoutId
- Size variants (sm/md/lg)
- Simpler than original (no flip logic)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Update CreditCardsContent to Use UntitledCardGridItem

**Files:**
- Modify: `apps/app/src/components/credit-cards/CreditCardsContent.tsx:96`

**Step 1: Update the import**

At the top of the file, change:
```tsx
import { CreditCardGridItem } from "./CreditCardGridItem";
```
to:
```tsx
import { UntitledCardGridItem } from "./UntitledCardGridItem";
```

**Step 2: Update the component usage**

Around line 96, change:
```tsx
<CreditCardGridItem
  key={card.id}
  card={card}
  isExtended={isExtended}
/>
```
to:
```tsx
<UntitledCardGridItem
  key={card.id}
  card={card}
  isExtended={isExtended}
/>
```

**Step 3: Verify typecheck passes**

Run: `cd apps/app && bun run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/app/src/components/credit-cards/CreditCardsContent.tsx
git commit -m "feat(credit-cards): swap grid to UntitledCardGridItem

Replace CreditCardGridItem with UntitledCardGridItem in the credit cards
grid view to use UntitledUI credit card visuals.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update CreditCardDetailContent to Use UntitledCardVisual

**Files:**
- Modify: `apps/app/src/components/credit-cards/CreditCardDetailContent.tsx:14,209`

**Step 1: Update the import**

At the top of the file, change:
```tsx
import { CardVisualWrapper } from "./CardVisualWrapper";
```
to:
```tsx
import { UntitledCardVisual } from "./UntitledCardVisual";
```

**Step 2: Update the component usage**

Around line 209, change:
```tsx
<CardVisualWrapper card={card} size="lg" />
```
to:
```tsx
<UntitledCardVisual card={card} size="lg" />
```

**Step 3: Verify typecheck passes**

Run: `cd apps/app && bun run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/app/src/components/credit-cards/CreditCardDetailContent.tsx
git commit -m "feat(credit-cards): swap detail view to UntitledCardVisual

Replace CardVisualWrapper with UntitledCardVisual in the credit card
detail view to use UntitledUI credit card visuals.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update KeyMetrics to Show Full Card Number (Optional)

**Files:**
- Modify: `apps/app/src/components/credit-cards/KeyMetrics.tsx`

**Step 1: Read current KeyMetrics component**

First, read the file to understand the current structure.

**Step 2: Add card number display**

Add a new metric showing the full card number (if available). This depends on whether `ExtendedCreditCardData` has access to the full card number. If not, skip this task.

Note: Based on the types file, `ExtendedCreditCardData` only has `lastFour`, not the full card number. The full card number would need to come from a separate query. For now, we can add the masked version to the metrics for visibility.

**Step 3: Verify typecheck passes**

Run: `cd apps/app && bun run typecheck`
Expected: No errors

**Step 4: Commit (if changes made)**

```bash
git add apps/app/src/components/credit-cards/KeyMetrics.tsx
git commit -m "feat(credit-cards): add card number to KeyMetrics

Display masked card number in the key metrics section for easy reference.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Final Verification

**Step 1: Run full typecheck**

Run: `cd apps/app && bun run typecheck`
Expected: No errors

**Step 2: Run dev server to visually verify**

Run: `bun run dev`
Navigate to `/credit-cards` and verify:
- Cards display with UntitledUI visual styles
- Different banks show different variants
- Shared element transitions work between grid and detail
- Extended details panel works correctly

**Step 3: Final commit (if any cleanup needed)**

---

## Testing Checklist

- [ ] Grid view renders all cards with correct bank variants
- [ ] Apple cards show `gray-light` variant
- [ ] Chase cards show `brand-dark` variant
- [ ] Unknown banks show `transparent-gradient` variant
- [ ] Shared element transition works grid → detail
- [ ] Shared element transition works detail → grid (back)
- [ ] Extended details panel expands/collapses correctly
- [ ] Utilization progress bar displays correctly
- [ ] Payment info displays correctly in extended view
- [ ] Cards are responsive at different viewport sizes
- [ ] Original SmartPockets components still importable

---

## Files Summary

**Created (6):**
1. `packages/ui/src/components/untitledui/shared-assets/credit-card/icons.tsx`
2. `apps/app/src/components/credit-cards/untitled-card-config.ts`
3. `apps/app/src/components/credit-cards/UntitledCreditCard.tsx`
4. `apps/app/src/components/credit-cards/UntitledCardGridItem.tsx`
5. `apps/app/src/components/credit-cards/UntitledCardVisual.tsx`
6. This plan document

**Modified (3):**
1. `packages/ui/src/components/untitledui/shared-assets/credit-card/credit-card.tsx`
2. `apps/app/src/components/credit-cards/CreditCardsContent.tsx`
3. `apps/app/src/components/credit-cards/CreditCardDetailContent.tsx`

**Preserved (all original SmartPockets components):**
- `apps/app/src/components/credit-cards/primitives/`
- `apps/app/src/components/credit-cards/CreditCardVisual.tsx`
- `apps/app/src/components/credit-cards/CreditCardGridItem.tsx`
- `apps/app/src/components/credit-cards/CardVisualWrapper.tsx`
