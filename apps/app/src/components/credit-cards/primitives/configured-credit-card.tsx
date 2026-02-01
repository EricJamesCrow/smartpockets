"use client";

import { AppleCardLayout } from "./apple-card-layout";
import { ChaseCardLayout } from "./chase-card-layout";
import { StandardCardLayout } from "./standard-card-layout";
import { CreditCard } from "./credit-card-primitives";
import { getCardConfig, type CreditCardData } from "./bank-config";

interface ConfiguredCreditCardProps {
  card: CreditCardData;
  fullCardNumber?: string;
  flipEnabled?: boolean;
  className?: string;
}

/**
 * ConfiguredCreditCard - Selects and renders the appropriate card layout
 * based on the card's configuration.
 *
 * Supports three layout types:
 * - 'apple': Apple Card style (logo top-left, chip right, centered name)
 * - 'chase': Chase style (logo top-left, mark watermark, network bottom-right)
 * - 'standard': Standard layout (chip left, name bottom-left, network bottom-right)
 *
 * @param card - Card data (name, expiry, etc.)
 * @param fullCardNumber - Full card number for back side (optional)
 * @param flipEnabled - Whether to enable flip on hover/click (default: false)
 */
export function ConfiguredCreditCard({
  card,
  fullCardNumber,
  flipEnabled = false,
  className,
}: ConfiguredCreditCardProps) {
  const config = getCardConfig(card);

  const sharedProps = {
    card,
    config,
    fullCardNumber,
    flipEnabled,
  };

  return (
    <CreditCard className={className}>
      {config.layout === "apple" ? (
        <AppleCardLayout {...sharedProps} />
      ) : config.layout === "chase" ? (
        <ChaseCardLayout {...sharedProps} />
      ) : (
        <StandardCardLayout {...sharedProps} />
      )}
    </CreditCard>
  );
}
