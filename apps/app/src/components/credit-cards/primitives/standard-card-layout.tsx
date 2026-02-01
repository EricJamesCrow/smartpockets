"use client";

import {
  CreditCardFlipper,
  CreditCardFront,
  CreditCardBack,
  CreditCardChip,
  CreditCardName,
  CreditCardNumber,
  CreditCardExpiry,
  CreditCardCvv,
  CreditCardServiceProvider,
  CreditCardMagStripe,
} from "./credit-card-primitives";
import { getBackgroundStyle, type BankCardConfig, type CreditCardData } from "./bank-config";

interface StandardCardLayoutProps {
  card: CreditCardData;
  config: BankCardConfig;
  fullCardNumber?: string;
  flipEnabled?: boolean;
}

export function StandardCardLayout({
  card,
  config,
  fullCardNumber,
  flipEnabled = false,
}: StandardCardLayoutProps) {
  const backgroundStyle = getBackgroundStyle(config.backgroundColor);
  const CustomChip = config.customChip;

  if (!flipEnabled) {
    // Grid view: Only render front side
    return (
      <CreditCardFront safeArea={config.safeArea} style={backgroundStyle}>
        <CreditCardChip>{CustomChip && <CustomChip />}</CreditCardChip>
        <CreditCardName className={`absolute bottom-0 left-0 ${config.textColor}`}>
          {card.cardholderName}
        </CreditCardName>
        <CreditCardServiceProvider
          type={config.network}
          className={`absolute bottom-0 right-0 max-h-1/3 max-w-1/3 ${
            config.serviceProviderClassName || ""
          }`}
        />
      </CreditCardFront>
    );
  }

  // Detail view: Render both sides with flipper
  return (
    <CreditCardFlipper>
      {/* Standard Card Front */}
      <CreditCardFront safeArea={config.safeArea} style={backgroundStyle}>
        <CreditCardChip>{CustomChip && <CustomChip />}</CreditCardChip>
        <CreditCardName className={`absolute bottom-0 left-0 ${config.textColor}`}>
          {card.cardholderName}
        </CreditCardName>
        <CreditCardServiceProvider
          type={config.network}
          className={`absolute bottom-0 right-0 max-h-1/3 max-w-1/3 ${
            config.serviceProviderClassName || ""
          }`}
        />
      </CreditCardFront>

      {/* Standard Card Back */}
      <CreditCardBack safeArea={config.safeArea} style={backgroundStyle}>
        <CreditCardMagStripe className={config.magStripeClassName} />
        <CreditCardNumber className={`absolute bottom-0 left-0 ${config.textColor}`}>
          {fullCardNumber}
        </CreditCardNumber>
        <div className="-translate-y-1/2 absolute top-1/2 flex gap-4">
          <CreditCardExpiry className={config.textColor}>
            {card.expiryDate}
          </CreditCardExpiry>
          <CreditCardCvv className={config.textColor}>•••</CreditCardCvv>
        </div>
      </CreditCardBack>
    </CreditCardFlipper>
  );
}
