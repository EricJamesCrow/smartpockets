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
      brand={card.brand}
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
