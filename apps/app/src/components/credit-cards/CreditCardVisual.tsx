"use client";

import type { FC, SVGProps } from "react";
import { useState } from "react";
import { motion } from "motion/react";
import { cx } from "@repo/ui/utils";
import VisaIcon from "@repo/ui/untitledui/foundations/payment-icons/visa-icon";
import MastercardIcon from "@repo/ui/untitledui/foundations/payment-icons/mastercard-icon";
import AmexIcon from "@repo/ui/untitledui/foundations/payment-icons/amex-icon";
import DiscoverIcon from "@repo/ui/untitledui/foundations/payment-icons/discover-icon";
import type { CardBrand } from "@/types/credit-cards";

interface CreditCardVisualProps {
  cardName: string;
  lastFour: string;
  cardholderName: string;
  company?: string;
  brand: CardBrand;
  isLocked?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** When false, disables flip interaction (useful for grid items that navigate on click) */
  interactive?: boolean;
}

/**
 * Visual representation of a credit card with optional 3D flip animation
 *
 * Displays the card with:
 * - Company branding (background color)
 * - Card name
 * - Last 4 digits
 * - Cardholder name
 * - Network logo (Visa, Mastercard, Amex, Discover)
 * - Flip interaction (hover on desktop, tap on mobile)
 */
export function CreditCardVisual({
  cardName,
  lastFour,
  cardholderName,
  company,
  brand,
  isLocked = false,
  size = "md",
  className,
  interactive = true,
}: CreditCardVisualProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const brandConfig = getBrandConfig(brand, company);
  const NetworkIcon = brandConfig.icon;

  const sizeClasses = {
    sm: "max-w-[240px]",
    md: "max-w-[320px]",
    lg: "max-w-[400px]",
  };

  const paddingClasses = {
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  };

  const handleFlip = () => {
    if (interactive) {
      setIsFlipped(!isFlipped);
    }
  };

  return (
    <div
      className={cx(
        "relative aspect-[1.586/1] w-full",
        interactive && "cursor-pointer",
        sizeClasses[size],
        className
      )}
      style={{ perspective: "1000px" }}
      onClick={handleFlip}
      onKeyDown={(e) => {
        if (interactive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleFlip();
        }
      }}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${cardName} credit card. Click to ${isFlipped ? "show front" : "show back"}` : `${cardName} credit card`}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      >
        {/* Front of card */}
        <div
          className={cx(
            "absolute inset-0 overflow-hidden rounded-xl shadow-lg",
            paddingClasses[size],
            brandConfig.bgClass,
            isLocked && "opacity-60 grayscale"
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Lock overlay */}
          {isLocked && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
              <div className="rounded-full bg-white/90 p-2">
                <LockIcon className="size-6 text-gray-700" />
              </div>
            </div>
          )}

          {/* EMV Chip */}
          <div className={cx("absolute top-1/3", size === "sm" ? "left-3" : "left-5")}>
            <div
              className={cx(
                "rounded bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 shadow-inner",
                size === "sm" ? "h-6 w-8" : size === "md" ? "h-9 w-12" : "h-10 w-14"
              )}
            >
              <div className="grid h-full w-full grid-cols-3 gap-px p-1">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-sm bg-yellow-200/50" />
                ))}
              </div>
            </div>
          </div>

          {/* Card Number (last 4) */}
          <div
            className={cx(
              "absolute left-5 right-5",
              size === "sm" ? "bottom-12" : size === "md" ? "bottom-16" : "bottom-20"
            )}
          >
            <div
              className={cx(
                "font-mono tracking-widest",
                brandConfig.textClass,
                size === "sm" ? "text-sm" : size === "md" ? "text-lg" : "text-xl"
              )}
            >
              •••• •••• •••• {lastFour}
            </div>
          </div>

          {/* Card Name */}
          <div className={cx("absolute right-5 top-5", size === "sm" && "right-3 top-3")}>
            <div
              className={cx(
                "font-medium",
                brandConfig.textClass,
                size === "sm" ? "text-xs" : "text-sm"
              )}
            >
              {cardName}
            </div>
          </div>

          {/* Cardholder Name */}
          <div className={cx("absolute bottom-5 left-5", size === "sm" && "bottom-3 left-3")}>
            <div
              className={cx(
                "uppercase tracking-wider",
                brandConfig.textClass,
                size === "sm" ? "text-[10px]" : "text-xs"
              )}
            >
              {cardholderName}
            </div>
          </div>

          {/* Network Logo */}
          <div className={cx("absolute bottom-5 right-5", size === "sm" && "bottom-2 right-2")}>
            {NetworkIcon && (
              <NetworkIcon
                className={cx(
                  "w-auto",
                  size === "sm" ? "h-5" : size === "md" ? "h-8" : "h-10"
                )}
              />
            )}
          </div>

          {/* Flip indicator (only shown when interactive) */}
          {interactive && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white/50">
              Tap to flip
            </div>
          )}
        </div>

        {/* Back of card */}
        <div
          className={cx(
            "absolute inset-0 overflow-hidden rounded-xl shadow-lg",
            brandConfig.bgClass,
            isLocked && "opacity-60 grayscale"
          )}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {/* Magnetic stripe */}
          <div className="mt-8 h-12 w-full bg-black/80" />

          {/* Signature strip */}
          <div className="mx-6 mt-4 flex items-center">
            <div className="h-10 flex-1 rounded bg-white/90 px-3 py-2">
              <div className="h-full w-full bg-[repeating-linear-gradient(90deg,#e5e5e5,#e5e5e5_1px,transparent_1px,transparent_4px)]" />
            </div>
            <div className="ml-2 rounded bg-white px-2 py-1">
              <span className="font-mono text-sm font-bold text-gray-800">CVV</span>
            </div>
          </div>

          {/* Hologram placeholder */}
          <div className="absolute bottom-8 left-6 right-6 flex items-center justify-between">
            <div className="h-8 w-16 rounded bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 opacity-70" />
            <div className={cx("text-xs", brandConfig.textClass)}>
              {company || "Credit Card"}
            </div>
          </div>

          {/* Network logo on back */}
          <div className="absolute bottom-4 right-4">
            {NetworkIcon && <NetworkIcon className="h-6 w-auto opacity-70" />}
          </div>

          {/* Flip indicator (only shown when interactive) */}
          {interactive && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white/50">
              Tap to flip
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Compact card visual for grid view (no flip animation)
 */
export function CreditCardVisualCompact({
  cardName,
  lastFour,
  company,
  brand,
  isLocked = false,
  className,
}: Omit<CreditCardVisualProps, "cardholderName" | "size">) {
  const brandConfig = getBrandConfig(brand, company);
  const NetworkIcon = brandConfig.icon;

  return (
    <div
      className={cx(
        "relative aspect-[1.586/1] w-full overflow-hidden rounded-lg p-3 shadow-md transition-transform",
        brandConfig.bgClass,
        isLocked && "opacity-60 grayscale",
        className
      )}
    >
      {/* Lock indicator */}
      {isLocked && (
        <div className="absolute right-2 top-2 rounded-full bg-white/90 p-1">
          <LockIcon className="size-3 text-gray-700" />
        </div>
      )}

      {/* EMV Chip */}
      <div className="absolute left-3 top-1/3">
        <div className="h-6 w-8 rounded-sm bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 shadow-inner" />
      </div>

      {/* Card Name */}
      <div className="absolute left-3 top-3">
        <div className={cx("text-xs font-medium truncate max-w-[70%]", brandConfig.textClass)}>
          {cardName}
        </div>
      </div>

      {/* Last 4 */}
      <div className="absolute bottom-3 left-3">
        <div className={cx("font-mono text-xs tracking-wider", brandConfig.textClass)}>
          •••• {lastFour}
        </div>
      </div>

      {/* Network Logo */}
      <div className="absolute bottom-2 right-2">
        {NetworkIcon && <NetworkIcon className="h-5 w-auto" />}
      </div>
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

// =============================================================================
// BRAND CONFIGURATION
// =============================================================================

interface BrandConfig {
  bgClass: string;
  textClass: string;
  icon: FC<SVGProps<SVGSVGElement>> | null;
}

/**
 * Get brand configuration for card styling
 */
function getBrandConfig(brand: CardBrand, company?: string): BrandConfig {
  // Company-specific overrides
  if (company) {
    const companyLower = company.toLowerCase();

    if (companyLower.includes("chase")) {
      return {
        bgClass: "bg-gradient-to-br from-blue-800 to-blue-950",
        textClass: "text-white",
        icon: getBrandIcon(brand),
      };
    }

    if (companyLower.includes("amex") || companyLower.includes("american express")) {
      return {
        bgClass: "bg-gradient-to-br from-blue-500 to-blue-700",
        textClass: "text-white",
        icon: AmexIcon,
      };
    }

    if (companyLower.includes("capital one")) {
      return {
        bgClass: "bg-gradient-to-br from-red-700 to-red-900",
        textClass: "text-white",
        icon: getBrandIcon(brand),
      };
    }

    if (companyLower.includes("citi")) {
      return {
        bgClass: "bg-gradient-to-br from-blue-600 to-blue-800",
        textClass: "text-white",
        icon: getBrandIcon(brand),
      };
    }

    if (companyLower.includes("discover")) {
      return {
        bgClass: "bg-gradient-to-br from-orange-500 to-orange-700",
        textClass: "text-white",
        icon: DiscoverIcon,
      };
    }

    if (companyLower.includes("wells fargo")) {
      return {
        bgClass: "bg-gradient-to-br from-red-800 to-red-950",
        textClass: "text-white",
        icon: getBrandIcon(brand),
      };
    }
  }

  // Default by brand
  switch (brand) {
    case "visa":
      return {
        bgClass: "bg-gradient-to-br from-gray-800 to-gray-950",
        textClass: "text-white",
        icon: VisaIcon,
      };
    case "mastercard":
      return {
        bgClass: "bg-gradient-to-br from-gray-700 to-gray-900",
        textClass: "text-white",
        icon: MastercardIcon,
      };
    case "amex":
      return {
        bgClass: "bg-gradient-to-br from-blue-500 to-blue-700",
        textClass: "text-white",
        icon: AmexIcon,
      };
    case "discover":
      return {
        bgClass: "bg-gradient-to-br from-orange-500 to-orange-700",
        textClass: "text-white",
        icon: DiscoverIcon,
      };
    default:
      return {
        bgClass: "bg-gradient-to-br from-gray-600 to-gray-800",
        textClass: "text-white",
        icon: VisaIcon,
      };
  }
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
      return VisaIcon;
  }
}
