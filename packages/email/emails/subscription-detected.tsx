import { Container, Html, Preview } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAlignedLinks as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

export interface SubscriptionDetectedProps {
    theme?: "light" | "dark";
    firstName: string;
    detected: Array<{
        subscriptionId: string;
        normalizedMerchant: string;
        averageAmountCents: number;
        frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "annual";
        confirmUrl: string;
        dismissUrl: string;
    }>;
    unsubscribeUrl?: string;
    preferencesUrl?: string;
    brandConfig?: Partial<EmailBrandConfig>;
}

const dollars = (cents: number) =>
    `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const SubscriptionDetected = ({
    theme,
    firstName = "there",
    detected,
    unsubscribeUrl,
    preferencesUrl,
    brandConfig,
}: SubscriptionDetectedProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const appUrl = config.appUrl ?? config.websiteUrl;
    const single = detected.length === 1;
    const preview = single
        ? `${detected[0].normalizedMerchant} looks like a recurring charge. Confirm or dismiss in one click.`
        : "Recurring charges detected across your accounts. Review below.";

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
                                Based on recent transactions, the following look like recurring subscriptions. Confirm the
                                ones you want to track so the agent can alert you before renewal, or dismiss the ones you
                                have already cancelled.
                            </Text>

                            <Container align="left" className="mt-6 max-w-full">
                                <Text className="text-md font-semibold">Detected subscriptions</Text>
                                {detected.map((row) => (
                                    <Container key={row.subscriptionId} align="left" className="mt-2 max-w-full">
                                        <Text className="text-sm text-tertiary">
                                            {row.normalizedMerchant}: {dollars(row.averageAmountCents)} ({row.frequency})
                                        </Text>
                                        <Text className="text-xs text-tertiary">
                                            <a href={row.confirmUrl}>Confirm</a> &middot;{" "}
                                            <a href={row.dismissUrl}>Not a subscription</a>
                                        </Text>
                                    </Container>
                                ))}
                            </Container>

                            <Text className="mt-6 text-xs text-tertiary">
                                SmartPockets looks for repeating charges from the same merchant, at similar amounts, on a
                                recognizable cadence. When the pattern holds for three or more occurrences, it gets flagged
                                as a possible subscription. We do not mark anything as confirmed until you say so.
                            </Text>

                            <Container align="left" className="mt-4 max-w-full">
                                <Text className="text-sm text-tertiary">What confirming does:</Text>
                                <Text className="text-sm text-tertiary">
                                    &bull; Groups the recurring charges under one view so you can see total annual cost.
                                </Text>
                                <Text className="text-sm text-tertiary">
                                    &bull; Lets the agent remind you before the next charge.
                                </Text>
                                <Text className="text-sm text-tertiary">
                                    &bull; Surfaces free-trial end dates when detectable from the merchant pattern.
                                </Text>
                            </Container>

                            <Button href={`${appUrl}/subscriptions?filter=unreviewed`} className="mt-8">
                                <Text className="text-md font-semibold">Review all detections</Text>
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

SubscriptionDetected.PreviewProps = {
    firstName: "Eric",
    detected: [
        {
            subscriptionId: "sub_1",
            normalizedMerchant: "Netflix",
            averageAmountCents: 1599,
            frequency: "monthly",
            confirmUrl: "https://app.smartpockets.com/subscriptions/sub_1?action=confirm",
            dismissUrl: "https://app.smartpockets.com/subscriptions/sub_1?action=dismiss",
        },
    ],
} satisfies SubscriptionDetectedProps;

export default SubscriptionDetected;
