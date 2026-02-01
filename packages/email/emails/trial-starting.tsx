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
 * Props for TrialStarting email template
 */
export interface TrialStartingProps {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName?: string;
    /** Plan name for the trial */
    planName: string;
    /** Trial duration in days */
    trialDays: number;
    /** Trial end date */
    trialEndDate: string;
    /** Features included in the trial */
    features?: string[];
    /** URL to dashboard */
    dashboardUrl: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const TrialStarting = ({
    theme,
    recipientName,
    planName,
    trialDays,
    trialEndDate,
    features = [],
    dashboardUrl,
    brandConfig,
}: TrialStartingProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>{`Your ${trialDays}-day ${planName} trial has started!`}</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Section align="left" className="max-w-full px-6 py-8">
                            <Row className="mb-6">
                                <Text className="text-tertiary">
                                    {greeting}
                                    <br />
                                    <br />
                                    Welcome! Your <strong>{trialDays}-day free trial</strong> of{" "}
                                    <strong>{planName}</strong> is now active. You have full access to all
                                    features until {trialEndDate}.
                                </Text>
                            </Row>

                            {features.length > 0 && (
                                <PricingTable
                                    planName={planName}
                                    amount="Free"
                                    interval="month"
                                    features={features}
                                    showFeatures={true}
                                />
                            )}

                            <Row className="mb-6">
                                <Button href={dashboardUrl}>
                                    <Text className="text-md font-semibold">Get started</Text>
                                </Button>
                            </Row>

                            <Section className="my-6 rounded-lg border border-solid border-secondary bg-secondary p-4">
                                <Row>
                                    <Text className="m-0 text-sm text-secondary">
                                        No credit card required during your trial. We'll send you a reminder
                                        before your trial ends.
                                    </Text>
                                </Row>
                            </Section>

                            <Row>
                                <Text className="text-md text-tertiary">
                                    Have questions? We're here to help at{" "}
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
