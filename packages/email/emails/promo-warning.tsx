import { Container, Html, Preview } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAlignedLinks as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

export interface PromoWarningProps {
    theme?: "light" | "dark";
    firstName: string;
    cadence: 30 | 14 | 7 | 1;
    cadenceLabel: string;
    promos: Array<{
        promoId: string;
        cardName: string;
        expirationDate: string;
        balanceCents: number;
        daysRemaining: number;
        cardDetailUrl: string;
    }>;
    unsubscribeUrl?: string;
    preferencesUrl?: string;
    brandConfig?: Partial<EmailBrandConfig>;
}

const dollars = (cents: number) =>
    `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const openingByCadence: Record<30 | 14 | 7 | 1, string> = {
    30: "You have deferred interest promo balances expiring in the next 30 days. Paying them off before the expiration date avoids the retroactive interest that accrues back to the original purchase dates.",
    14: "Two weeks remain on your deferred interest promo balances. At expiration, any unpaid balance triggers interest back to the purchase date.",
    7: "One week remains. This is a good time to confirm payment is scheduled for the full balance before each expiration.",
    1: "Your deferred interest promos expire tomorrow. Paying the full balance today avoids a retroactive interest charge that accrues back to each purchase date.",
};

const actionByCadence: Record<30 | 14 | 7 | 1, string> = {
    30: "Open a card to see the exact promo terms and adjust your payment plan.",
    14: "Open a card to see the exact promo terms and adjust your payment plan.",
    7: "If you cannot pay in full, you may be able to restructure via an installment plan through your card issuer.",
    1: "Pay now via your card issuer's site, or pay in full when your statement closes.",
};

export const PromoWarning = ({
    theme,
    firstName = "there",
    cadence,
    cadenceLabel,
    promos,
    unsubscribeUrl,
    preferencesUrl,
    brandConfig,
}: PromoWarningProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const appUrl = config.appUrl ?? config.websiteUrl;

    const preview =
        cadence === 30
            ? "Pay the balance before expiration to avoid a retroactive interest charge."
            : cadence === 14
                ? "Two weeks left to pay off the deferred interest balance."
                : cadence === 7
                    ? "One week left. Interest will be charged from the original purchase date if unpaid."
                    : "Pay in full today to avoid interest charges back to the purchase date.";

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>{preview}</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header
                            logoUrl={config.logoUrl}
                            logoAlt={config.logoAlt}
                            homeUrl={config.websiteUrl}
                            navLinks={config.navLinks}
                        />
                        <Container align="left" className="max-w-full px-6 py-8">
                            <Text className="text-sm text-tertiary md:text-md">
                                Hi {firstName},
                                <br />
                                <br />
                                {openingByCadence[cadence]}
                            </Text>

                            <Container align="left" className="mt-6 max-w-full">
                                <Text className="text-md font-semibold">Promos expiring {cadenceLabel}</Text>
                                {promos.map((row) => (
                                    <Text key={row.promoId} className="text-sm text-tertiary">
                                        {row.cardName}: {dollars(row.balanceCents)} (expires {row.expirationDate})
                                    </Text>
                                ))}
                            </Container>

                            <Text className="mt-6 text-sm text-tertiary">{actionByCadence[cadence]}</Text>

                            <Text className="mt-6 text-xs text-tertiary">
                                Deferred interest is different from 0 percent APR. If any balance remains after the expiration
                                date, interest is charged as if the promo never happened, from the original purchase date.
                            </Text>
                            <Text className="mt-2 text-xs text-tertiary">
                                SmartPockets tracks expiration dates but does not make payments on your behalf. Payment
                                scheduling happens on your card issuer's site.
                            </Text>

                            <Button href={`${appUrl}/credit-cards?filter=active-promos`} className="mt-8">
                                <Text className="text-md font-semibold">See my promos</Text>
                            </Button>
                        </Container>
                        <Footer
                            companyName={config.companyName}
                            copyrightYear={config.copyrightYear}
                            legalLinks={{
                                ...config.legalLinks,
                                unsubscribe: unsubscribeUrl,
                                preferences: preferencesUrl,
                            }}
                        />
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

PromoWarning.PreviewProps = {
    firstName: "Eric",
    cadence: 30,
    cadenceLabel: "in 30 days",
    promos: [
        {
            promoId: "p1",
            cardName: "Citi Double Cash",
            expirationDate: "2026-05-20",
            balanceCents: 250000,
            daysRemaining: 30,
            cardDetailUrl: "https://app.smartpockets.com/credit-cards/c1",
        },
    ],
} satisfies PromoWarningProps;

export default PromoWarning;
