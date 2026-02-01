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
 * Props for SubscriptionCreated email template
 */
export interface SubscriptionCreatedProps {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName?: string;
    /** Plan name */
    planName: string;
    /** Price amount */
    amount: string;
    /** Billing interval */
    interval?: "month" | "year";
    /** Features included in the plan */
    features?: string[];
    /** URL to dashboard */
    dashboardUrl: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const SubscriptionCreated = ({
    theme,
    recipientName,
    planName,
    amount,
    interval = "month",
    features = [],
    dashboardUrl,
    brandConfig,
}: SubscriptionCreatedProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Welcome to {planName}!</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Section align="left" className="max-w-full px-6 py-8">
                            <Row className="mb-6">
                                <Text className="text-tertiary">
                                    {greeting}
                                    <br />
                                    <br />
                                    Thank you for subscribing! Your <strong>{planName}</strong> subscription is now active.
                                </Text>
                            </Row>

                            <PricingTable
                                planName={planName}
                                amount={amount}
                                interval={interval}
                                features={features}
                            />

                            <Row className="mb-6">
                                <Button href={dashboardUrl}>
                                    <Text className="text-md font-semibold">Go to dashboard</Text>
                                </Button>
                            </Row>

                            <Row>
                                <Text className="text-md text-tertiary">
                                    You'll be billed {amount} every {interval}. You can manage your subscription
                                    anytime from your dashboard.
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
