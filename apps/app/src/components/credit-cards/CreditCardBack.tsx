"use client";

import type { FC, SVGProps } from "react";
import { cx } from "@repo/ui/utils";
import VisaIcon from "@repo/ui/untitledui/foundations/payment-icons/visa-icon";
import MastercardIcon from "@repo/ui/untitledui/foundations/payment-icons/mastercard-icon";
import AmexIcon from "@repo/ui/untitledui/foundations/payment-icons/amex-icon";
import DiscoverIcon from "@repo/ui/untitledui/foundations/payment-icons/discover-icon";
import type { CardBrand, ExtendedCreditCardData } from "@/types/credit-cards";
import { getUntitledVariant } from "./untitled-card-config";

interface CreditCardBackProps {
  card: ExtendedCreditCardData;
  className?: string;
}

/**
 * Card back design matching UntitledUI aesthetic
 *
 * Features:
 * - Magnetic stripe
 * - Signature strip with grid pattern
 * - CVV box
 * - Hologram placeholder (gradient)
 * - Company name and brand logo
 */
export function CreditCardBack({ card, className }: CreditCardBackProps) {
  const variant = getUntitledVariant(card.company);
  const bgClass = getBackgroundClass(variant);
  const NetworkIcon = getBrandIcon(card.brand);

  return (
    <div
      className={cx(
        "relative h-full w-full overflow-hidden rounded-2xl",
        bgClass,
        className
      )}
    >
      {/* Magnetic stripe */}
      <div className="absolute inset-x-0 top-6 h-10 bg-black/90" />

      {/* Signature strip area */}
      <div className="absolute inset-x-6 top-20 flex items-stretch gap-2">
        {/* Signature strip with grid pattern */}
        <div className="relative flex-1 overflow-hidden rounded bg-gray-100 px-3 py-2">
          {/* Grid pattern background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 3px,
                rgba(0, 0, 0, 0.03) 3px,
                rgba(0, 0, 0, 0.03) 4px
              )`,
            }}
          />
          {/* Simulated signature scribble */}
          <div className="relative z-10 flex h-full items-center">
            <svg className="h-4 w-20 text-gray-400" viewBox="0 0 80 16">
              <path
                d="M2 8 Q10 2 20 8 T40 8 T60 8 T78 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* CVV box */}
        <div className="flex w-12 flex-col items-center justify-center rounded bg-white px-2 py-1">
          <span className="text-[8px] font-medium tracking-wider text-gray-500">
            CVV
          </span>
          <span className="font-mono text-xs font-bold text-gray-800">***</span>
        </div>
      </div>

      {/* Hologram and company info */}
      <div className="absolute inset-x-6 bottom-10 flex items-center justify-between">
        {/* Hologram placeholder */}
        <div className="h-6 w-12 rounded bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 opacity-70" />

        {/* Company name */}
        <span className="text-xs font-medium text-white/80">
          {card.company || "Credit Card"}
        </span>
      </div>

      {/* Network logo */}
      <div className="absolute bottom-4 right-4">
        {NetworkIcon && <NetworkIcon className="h-6 w-auto opacity-80" />}
      </div>

      {/* Decorative lines for visual interest */}
      <div className="absolute bottom-20 left-6 right-6">
        <div className="h-px bg-white/10" />
      </div>
    </div>
  );
}

/**
 * Get background class based on card variant to match front
 */
function getBackgroundClass(variant: string): string {
  // Map variants to appropriate gradient backgrounds
  const variantBackgrounds: Record<string, string> = {
    "brand-dark": "bg-gradient-to-br from-brand-900 to-brand-800",
    "brand-light": "bg-brand-200",
    "gray-dark": "bg-gradient-to-br from-gray-900 to-gray-800",
    "gray-light": "bg-gray-200",
    transparent: "bg-gray-800/90 backdrop-blur-md",
    "transparent-gradient": "bg-gray-800/90 backdrop-blur-md",
    "transparent-strip": "bg-gray-800",
    "gray-strip": "bg-gray-700",
    "gradient-strip": "bg-gradient-to-b from-[#8BA8D9] to-[#D9A7D5]",
    "salmon-strip": "bg-[#D4B8AC]",
    "gray-strip-vertical": "bg-gray-800",
    "gradient-strip-vertical": "bg-gradient-to-b from-[#D9A7D5] to-[#8B7BB8]",
    "salmon-strip-vertical": "bg-[#D4B8AC]",
  };

  return variantBackgrounds[variant] || "bg-gradient-to-br from-gray-800 to-gray-900";
}

/**
 * Get network icon by brand
 */
function getBrandIcon(brand: CardBrand): FC<SVGProps<SVGSVGElement>> | null {
  switch (brand) {
    case "visa":
      return VisaIcon;
    case "mastercard":
      return MastercardIcon;
    case "amex":
      return AmexIcon;
    case "discover":
      return DiscoverIcon;
    default:
      return null;
  }
}
