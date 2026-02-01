"use client";

import {
  CreditCardFlipper,
  CreditCardFront,
  CreditCardBack,
  CreditCardChip,
  CreditCardName,
  CreditCardServiceProvider,
  CreditCardMagStripe,
  CreditCardLogo,
} from "./credit-card-primitives";
import { MastercardLogo } from "./bank-logos";
import { getBackgroundStyle, type BankCardConfig, type CreditCardData } from "./bank-config";

interface AppleCardLayoutProps {
  card: CreditCardData;
  config: BankCardConfig;
  fullCardNumber?: string;
  flipEnabled?: boolean;
}

export function AppleCardLayout({
  card,
  config,
  fullCardNumber,
  flipEnabled = false,
}: AppleCardLayoutProps) {
  const backgroundStyle = getBackgroundStyle(config.backgroundColor);
  const LogoComponent = config.logo;
  const CustomChip = config.customChip;

  if (!flipEnabled) {
    // Grid view: Only render front side
    return (
      <CreditCardFront safeArea={config.safeArea} style={backgroundStyle}>
        {LogoComponent && (
          <CreditCardLogo className="absolute top-0 right-auto left-0 size-1/8">
            <LogoComponent />
          </CreditCardLogo>
        )}
        <CreditCardChip className="right-1 left-auto w-1/5">
          {CustomChip && <CustomChip />}
        </CreditCardChip>
        <CreditCardName
          className={`-translate-y-1/2 absolute top-1/2 mt-4 ${config.textColor}`}
        >
          {card.cardholderName}
        </CreditCardName>
      </CreditCardFront>
    );
  }

  // Detail view: Render both sides with flipper
  return (
    <CreditCardFlipper>
      {/* Apple Card Front */}
      <CreditCardFront safeArea={config.safeArea} style={backgroundStyle}>
        {LogoComponent && (
          <CreditCardLogo className="absolute top-0 right-auto left-0 size-1/8">
            <LogoComponent />
          </CreditCardLogo>
        )}
        <CreditCardChip className="right-1 left-auto w-1/5">
          {CustomChip && <CustomChip />}
        </CreditCardChip>
        <CreditCardName
          className={`-translate-y-1/2 absolute top-1/2 mt-4 ${config.textColor}`}
        >
          {card.cardholderName}
        </CreditCardName>
      </CreditCardFront>

      {/* Apple Card Back */}
      <CreditCardBack
        safeArea={config.backSafeArea ?? config.safeArea}
        style={backgroundStyle}
      >
        <CreditCardServiceProvider
          type={config.network}
          className="top-6 right-6 max-h-1/4 max-w-1/4"
        >
          {config.network === "Mastercard" && (
            <MastercardLogo className="w-full" />
          )}
        </CreditCardServiceProvider>
        <CreditCardMagStripe
          className={`top-auto bottom-0 ${
            config.magStripeClassName || "bg-[#BEBEC0]"
          }`}
        />
      </CreditCardBack>
    </CreditCardFlipper>
  );
}
