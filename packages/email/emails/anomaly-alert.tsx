import { Container, Html, Preview } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAlignedLinks as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

export interface AnomalyAlertProps {
    theme?: "light" | "dark";
    firstName: string;
    anomalies: Array<{
        anomalyId: string;
        transactionDate: string;
        merchantName: string;
        amountCents: number;
        cardName: string;
        transactionUrl: string;
    }>;
    unsubscribeUrl?: string;
    preferencesUrl?: string;
    brandConfig?: Partial<EmailBrandConfig>;
}

const dollars = (cents: number) =>
    `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AnomalyAlert = ({
    theme,
    firstName = "there",
    anomalies,
    unsubscribeUrl,
    preferencesUrl,
    brandConfig,
}: AnomalyAlertProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const appUrl = config.appUrl ?? config.websiteUrl;
    const firstAnomaly = anomalies.length === 1 ? anomalies[0] : undefined;
    const preview = firstAnomaly
        ? `${dollars(firstAnomaly.amountCents)} at ${firstAnomaly.merchantName} stands out against recent spending patterns.`
        : `SmartPockets flagged ${anomalies.length} charges that look different from your usual spend.`;

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
                                We flagged the following transactions because they do not match your usual patterns. These
                                are not necessarily fraud; they are worth a second look.
                            </Text>

                            <Container align="left" className="mt-6 max-w-full">
                                <Text className="text-md font-semibold">Flagged transactions</Text>
                                {anomalies.map((row) => (
                                    <Text key={row.anomalyId} className="text-sm text-tertiary">
                                        {row.transactionDate} &middot; {row.merchantName} &middot; {dollars(row.amountCents)}{" "}
                                        &middot; {row.cardName}
                                    </Text>
                                ))}
                            </Container>

                            <Text className="mt-6 text-xs text-tertiary">
                                Each flag means the transaction amount is at least three times the average for that merchant
                                or card over the last 90 days, or the merchant is new to your spending history above a
                                threshold.
                            </Text>

                            <Container align="left" className="mt-4 max-w-full">
                                <Text className="text-sm text-tertiary">
                                    &bull; If the charge is expected, mark it as reviewed so it does not appear in a future
                                    digest.
                                </Text>
                                <Text className="text-sm text-tertiary">
                                    &bull; If it is not your charge, contact your card issuer's fraud line directly.
                                    SmartPockets does not have the ability to dispute charges on your behalf.
                                </Text>
                                <Text className="text-sm text-tertiary">
                                    &bull; If you want to silence similar flags from the same merchant, the agent can set a
                                    personal threshold.
                                </Text>
                            </Container>

                            <Button href={`${appUrl}/transactions?filter=anomalies`} className="mt-8">
                                <Text className="text-md font-semibold">Review flagged transactions</Text>
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

AnomalyAlert.PreviewProps = {
    firstName: "Eric",
    anomalies: [
        {
            anomalyId: "anom_1",
            transactionDate: "Apr 20",
            merchantName: "Unknown Merchant",
            amountCents: 48900,
            cardName: "Chase Sapphire",
            transactionUrl: "https://app.smartpockets.com/transactions/tx_1",
        },
    ],
} satisfies AnomalyAlertProps;

export default AnomalyAlert;
