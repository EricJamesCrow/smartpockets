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
 * Props for TrialEnded email template
 */
export interface TrialEndedProps {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName?: string;
    /** Plan name that was trialed */
    planName: string;
    /** Plan price */
    planAmount: string;
    /** Billing interval */
    interval?: "month" | "year";
    /** Features included in the plan */
    features?: string[];
    /** URL to upgrade/subscribe */
    upgradeUrl: string;
    /** Special offer discount (optional) */
    discountPercent?: number;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const TrialEnded = ({
    theme,
    recipientName,
    planName,
    planAmount,
    interval = "month",
    features = [],
    upgradeUrl,
    discountPercent,
    brandConfig,
}: TrialEndedProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Your {planName} trial has ended</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Section align="left" className="max-w-full px-6 py-8">
                            <Row className="mb-6">
                                <Text className="text-tertiary">
                                    {greeting}
                                    <br />
                                    <br />
                                    Your <strong>{planName}</strong> trial has ended. Your account has been
                                    downgraded to our free plan.
                                </Text>
                            </Row>

                            <Section className="my-6 rounded-lg border border-solid border-secondary bg-secondary p-4">
                                <Row>
                                    <Text className="m-0 text-sm text-secondary">
                                        Don't worry — your data is still safe. Upgrade anytime to regain
                                        access to all premium features.
                                    </Text>
                                </Row>
                            </Section>

                            {discountPercent && (
                                <Section className="my-6 rounded-lg border border-solid border-success-secondary bg-success-primary/10 p-4">
                                    <Row>
                                        <Text className="m-0 text-sm text-success-primary">
                                            Special offer: Get <strong>{discountPercent}% off</strong> your
                                            first {interval} when you subscribe today!
                                        </Text>
                                    </Row>
                                </Section>
                            )}

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
                                    <Text className="text-md font-semibold">
                                        {discountPercent
                                            ? `Claim ${discountPercent}% off`
                                            : "Upgrade now"}
                                    </Text>
                                </Button>
                            </Row>

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
