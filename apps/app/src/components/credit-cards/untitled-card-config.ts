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
