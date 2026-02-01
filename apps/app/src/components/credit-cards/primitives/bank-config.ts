import type { HTMLAttributes } from "react";
import {
  ChaseLogo,
  ChaseMark,
  AppleLogo,
  AppleChip,
  WellsFargoLogo,
} from "./bank-logos";

// =============================================================================
// TYPES
// =============================================================================

export type PaymentNetwork = "Visa" | "Mastercard" | "Amex" | "Discover";
export type CardLayout = "standard" | "chase" | "apple";
export type ChipStyle = "default" | "custom";

export interface BankCardConfig {
  bankName: string;
  backgroundColor: string; // hex color or gradient
  textColor: string; // Tailwind class
  logo?: React.ComponentType<HTMLAttributes<SVGElement>>;
  mark?: React.ComponentType<HTMLAttributes<SVGElement>>;
  network: PaymentNetwork;
  chipStyle: ChipStyle;
  customChip?: React.ComponentType<HTMLAttributes<SVGElement>>;
  safeArea: number;
  backSafeArea?: number; // optional separate safe area for back
  layout: CardLayout;
  serviceProviderClassName?: string; // optional className for payment network logo
  magStripeClassName?: string; // optional className for magnetic stripe
}

export type CreditCardData = {
  id: string;
  cardName: string;
  company: string;
  brand: PaymentNetwork;
  lastFour: string;
  cardholderName: string;
  expiryDate?: string;
};

// =============================================================================
// BANK DEFAULTS
// =============================================================================

// Bank defaults - provide shared properties like logos, layouts, safe areas
// These are used as fallbacks when cards don't have specific configs
const bankDefaults: Record<string, BankCardConfig> = {
  Chase: {
    bankName: "Chase",
    backgroundColor: "#063573",
    textColor: "text-white",
    logo: ChaseLogo,
    mark: ChaseMark,
    network: "Visa",
    chipStyle: "default",
    safeArea: 20,
    layout: "chase",
    serviceProviderClassName: "brightness-0 invert",
  },
  Apple: {
    bankName: "Apple",
    backgroundColor: "#F2F2F2",
    textColor: "text-[#909090]",
    logo: AppleLogo,
    chipStyle: "custom",
    customChip: AppleChip,
    network: "Mastercard",
    safeArea: 24,
    backSafeArea: 0,
    layout: "apple",
  },
  "Wells Fargo": {
    bankName: "Wells Fargo",
    backgroundColor: "#D41C2C",
    textColor: "text-white",
    logo: WellsFargoLogo,
    network: "Visa",
    chipStyle: "default",
    safeArea: 20,
    layout: "standard",
  },
  Citi: {
    bankName: "Citibank",
    backgroundColor: "#003B70",
    textColor: "text-white",
    network: "Visa",
    chipStyle: "default",
    safeArea: 20,
    layout: "standard",
  },
  Citibank: {
    bankName: "Citibank",
    backgroundColor: "#003B70",
    textColor: "text-white",
    network: "Visa",
    chipStyle: "default",
    safeArea: 20,
    layout: "standard",
  },
  "American Express": {
    bankName: "American Express",
    backgroundColor: "linear-gradient(135deg, #71717a 0%, #18181b 100%)",
    textColor: "text-white",
    network: "Amex",
    chipStyle: "default",
    safeArea: 20,
    layout: "standard",
  },
  "Capital One": {
    bankName: "Capital One",
    backgroundColor: "linear-gradient(135deg, #94a3b8 0%, #0369a1 100%)",
    textColor: "text-white",
    network: "Mastercard",
    chipStyle: "default",
    safeArea: 20,
    layout: "standard",
  },
  Synchrony: {
    bankName: "Synchrony",
    backgroundColor: "linear-gradient(135deg, #FF9900 0%, #232F3E 100%)",
    textColor: "text-white",
    network: "Visa",
    chipStyle: "default",
    safeArea: 20,
    layout: "standard",
  },
  Discover: {
    bankName: "Discover",
    backgroundColor: "linear-gradient(135deg, #ff6b00 0%, #ff9500 100%)",
    textColor: "text-white",
    network: "Discover",
    chipStyle: "default",
    safeArea: 20,
    layout: "standard",
  },
};

// =============================================================================
// CARD-SPECIFIC CONFIGS
// =============================================================================

// Card-specific configurations - these override bank defaults
// Only specify properties that differ from bank defaults
const cardConfigs: Record<string, Partial<BankCardConfig>> = {
  "Apple Card": {
    backgroundColor: "#F2F2F2",
    textColor: "text-[#909090]",
    logo: AppleLogo,
    chipStyle: "custom",
    customChip: AppleChip,
    network: "Mastercard",
    safeArea: 24,
    backSafeArea: 0,
    layout: "apple",
  },
  "Chase Slate Edge": {
    backgroundColor: "linear-gradient(135deg, #4a5568 0%, #2d3748 100%)",
  },
  "Chase Ink Business Unlimited": {
    backgroundColor: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)",
  },
  "Chase Amazon Prime Visa": {
    backgroundColor: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
  },
  "Chase Sapphire Preferred": {
    backgroundColor: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)",
  },
  "Chase Sapphire Reserve": {
    backgroundColor: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
  },
  "Wells Fargo Reflect": {
    backgroundColor: "linear-gradient(135deg, #8B0000 0%, #1a1a2e 100%)",
  },
  "Citi Best Buy Visa": {
    backgroundColor: "linear-gradient(135deg, #FFE000 0%, #0046BE 100%)",
    textColor: "text-gray-900",
  },
  "Citi Diamond Preferred": {
    backgroundColor: "linear-gradient(135deg, #0369a1 0%, #0c4a6e 100%)",
  },
  "Citi Simplicity": {
    backgroundColor: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
  },
  "American Express Blue Cash Everyday": {
    backgroundColor: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  },
  "American Express Business Platinum": {
    backgroundColor: "linear-gradient(135deg, #71717a 0%, #18181b 100%)",
  },
  "American Express Gold": {
    backgroundColor: "linear-gradient(135deg, #b45309 0%, #78350f 100%)",
  },
  "Capital One Quicksilver": {
    backgroundColor: "linear-gradient(135deg, #94a3b8 0%, #0369a1 100%)",
  },
  "Synchrony Amazon Store Card": {
    backgroundColor: "linear-gradient(135deg, #FF9900 0%, #232F3E 100%)",
  },
  "Discover it Cash Back": {
    backgroundColor: "linear-gradient(135deg, #ff6b00 0%, #ff9500 100%)",
  },
};

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

// Default fallback configuration
const defaultConfig: BankCardConfig = {
  bankName: "Unknown",
  backgroundColor: "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
  textColor: "text-white",
  network: "Visa",
  chipStyle: "default",
  safeArea: 20,
  layout: "standard",
};

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Get bank default configuration
 * Used internally for fallback when card-specific config doesn't exist
 */
function getBankDefault(company: string): BankCardConfig {
  const trimmedCompany = company.trim();

  // Direct match
  if (bankDefaults[trimmedCompany]) {
    return bankDefaults[trimmedCompany];
  }

  // Case-insensitive lookup
  const normalizedCompany = trimmedCompany.toLowerCase();
  const matchingKey = Object.keys(bankDefaults).find(
    (key) => key.toLowerCase() === normalizedCompany
  );

  if (matchingKey) {
    // Safe: we just found this key exists in bankDefaults
    return bankDefaults[matchingKey]!;
  }

  // Return default config
  return defaultConfig;
}

/**
 * Get card configuration for a credit card
 * Two-tier lookup: first tries card-specific config, then falls back to bank default
 */
export function getCardConfig(card: CreditCardData): BankCardConfig {
  const normalizedCardName = card.cardName.toLowerCase();

  // 1. Try exact card name match (case-insensitive)
  const cardKey = Object.keys(cardConfigs).find(
    (key) => key.toLowerCase() === normalizedCardName
  );

  if (cardKey) {
    const cardConfig = cardConfigs[cardKey];
    const bankDefault = getBankDefault(card.company);

    // Merge: card-specific overrides bank default
    return {
      ...bankDefault,
      ...cardConfig,
      network: mapBrandToNetwork(card.brand), // Always use card's actual network
    };
  }

  // 2. Fallback to bank config
  const bankDefault = getBankDefault(card.company);
  return {
    ...bankDefault,
    network: mapBrandToNetwork(card.brand), // Always use card's actual network
  };
}

/**
 * Map CardBrand to PaymentNetwork
 */
function mapBrandToNetwork(
  brand: string
): PaymentNetwork {
  switch (brand.toLowerCase()) {
    case "visa":
      return "Visa";
    case "mastercard":
      return "Mastercard";
    case "amex":
      return "Amex";
    case "discover":
      return "Discover";
    default:
      return "Visa";
  }
}

// =============================================================================
// UTILS
// =============================================================================

/**
 * Utility function to determine the correct style prop for background
 * Handles both linear gradients and solid colors
 */
export function getBackgroundStyle(
  backgroundColor: string
): React.CSSProperties {
  return backgroundColor.startsWith("linear-gradient")
    ? { background: backgroundColor }
    : { backgroundColor: backgroundColor };
}
