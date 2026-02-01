import { Container, Html, Preview, Row, Section } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAligned as Header } from "./_components/header";
import { PricingTable } from "./_components/pricing-table";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

/**
 * Props for TrialEnding email template
 */
export interface TrialEndingProps {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName?: string;
    /** Plan name */
    planName: string;
    /** Days remaining in trial */
    daysLeft: number;
    /** Trial end date */
    trialEndDate: string;
    /** Plan price after trial */
    planAmount: string;
    /** Billing interval after trial */
    interval?: "month" | "year";
    /** Features included in the plan */
    features?: string[];
    /** URL to upgrade/subscribe */
    upgradeUrl: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const TrialEnding = ({
    theme,
    recipientName,
    planName,
    daysLeft,
    trialEndDate,
    planAmount,
    interval = "month",
    features = [],
    upgradeUrl,
    brandConfig,
}: TrialEndingProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";
    const daysText = daysLeft === 1 ? "1 day" : `${daysLeft} days`;

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Your {planName} trial ends in {daysText}</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Section align="left" className="max-w-full px-6 py-8">
                            <Row className="mb-6">
                                <Text className="text-tertiary">
                                    {greeting}
                                    <br />
                                    <br />
                                    Your <strong>{planName}</strong> trial ends in <strong>{daysText}</strong>{" "}
                                    (on {trialEndDate}). Subscribe now to keep access to all your features.
                                </Text>
                            </Row>

                            <Section className="my-6 rounded-lg border border-solid border-warning-secondary bg-warning-primary/10 p-4">
                                <Row>
                                    <Text className="m-0 text-sm text-warning-primary">
                                        After your trial ends, you'll lose access to premium features unless
                                        you subscribe.
                                    </Text>
                                </Row>
                            </Section>

                            {features.length > 0 && (
                                <PricingTable
                                    planName={planName}
                                    amount={planAmount}
                                    interval={interval}
                                    features={features}
                                    showFeatures={true}
                                />
                            )}

                            <Row className="mb-6">
                                <Button href={upgradeUrl}>
                                    <Text className="text-md font-semibold">Subscribe now</Text>
                                </Button>
                            </Row>

                            <Row>
                                <Text className="text-md text-tertiary">
                                    Have questions about our plans? Contact us at{" "}
                                    <a href={`mailto:${config.supportEmail}`} className="text-brand-secondary">
                                        {config.supportEmail}
                                    </a>
                                    .
                                    <br />
                                    <br />
                                    Thanks,
                                    <br />
                                    The {config.companyName} team
                                </Text>
                            </Row>
                        </Section>
                        <Footer
                            companyName={config.companyName}
                            copyrightYear={config.copyrightYear}
                            legalLinks={config.legalLinks}
                        />
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};
