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
  CreditCardLogo,
} from "./credit-card-primitives";
import { getBackgroundStyle, type BankCardConfig, type CreditCardData } from "./bank-config";

interface ChaseCardLayoutProps {
  card: CreditCardData;
  config: BankCardConfig;
  fullCardNumber?: string;
  flipEnabled?: boolean;
}

export function ChaseCardLayout({
  card,
  config,
  fullCardNumber,
  flipEnabled = false,
}: ChaseCardLayoutProps) {
  const backgroundStyle = getBackgroundStyle(config.backgroundColor);
  const LogoComponent = config.logo;
  const MarkComponent = config.mark;
  const CustomChip = config.customChip;

  if (!flipEnabled) {
    // Grid view: Only render front side
    return (
      <CreditCardFront safeArea={config.safeArea} style={backgroundStyle}>
        {LogoComponent && (
          <LogoComponent className="absolute top-0 left-0 h-1/12" />
        )}
        {MarkComponent && (
          <CreditCardLogo>
            <MarkComponent className="text-[#0e72d1]" />
          </CreditCardLogo>
        )}
        <CreditCardChip>{CustomChip && <CustomChip />}</CreditCardChip>
        <CreditCardServiceProvider
          type={config.network}
          format="logo"
          className={`absolute bottom-0 right-0 max-h-1/3 max-w-1/3 ${
            config.serviceProviderClassName || ""
          }`}
        />
        <CreditCardName className={`absolute bottom-0 left-0 ${config.textColor}`}>
          {card.cardholderName}
        </CreditCardName>
      </CreditCardFront>
    );
  }

  // Detail view: Render both sides with flipper
  return (
    <CreditCardFlipper>
      {/* Chase Card Front */}
      <CreditCardFront safeArea={config.safeArea} style={backgroundStyle}>
        {LogoComponent && (
          <LogoComponent className="absolute top-0 left-0 h-1/12" />
        )}
        {MarkComponent && (
          <CreditCardLogo>
            <MarkComponent className="text-[#0e72d1]" />
          </CreditCardLogo>
        )}
        <CreditCardChip>{CustomChip && <CustomChip />}</CreditCardChip>
        <CreditCardServiceProvider
          type={config.network}
          format="logo"
          className={`absolute bottom-0 right-0 max-h-1/3 max-w-1/3 ${
            config.serviceProviderClassName || ""
          }`}
        />
        <CreditCardName className={`absolute bottom-0 left-0 ${config.textColor}`}>
          {card.cardholderName}
        </CreditCardName>
      </CreditCardFront>

      {/* Chase Card Back */}
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
