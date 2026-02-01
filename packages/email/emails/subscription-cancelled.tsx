import { Container, Html, Preview, Row, Section } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAligned as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

/**
 * Props for SubscriptionCancelled email template
 */
export interface SubscriptionCancelledProps {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName?: string;
    /** Plan name being cancelled */
    planName: string;
    /** End date of subscription */
    endDate: string;
    /** URL to reactivate subscription */
    reactivateUrl: string;
    /** URL to provide feedback */
    feedbackUrl?: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const SubscriptionCancelled = ({
    theme,
    recipientName,
    planName,
    endDate,
    reactivateUrl,
    feedbackUrl,
    brandConfig,
}: SubscriptionCancelledProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Your {planName} subscription has been cancelled</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Section align="left" className="max-w-full px-6 py-8">
                            <Row className="mb-6">
                                <Text className="text-tertiary">
                                    {greeting}
                                    <br />
                                    <br />
                                    Your <strong>{planName}</strong> subscription has been cancelled. You'll
                                    continue to have access to all features until <strong>{endDate}</strong>.
                                </Text>
                            </Row>

                            <Section className="my-6 rounded-lg border border-solid border-secondary bg-secondary p-4">
                                <Row>
                                    <Text className="m-0 text-sm text-secondary">
                                        We're sorry to see you go. If you change your mind, you can reactivate
                                        your subscription anytime before your access ends.
                                    </Text>
                                </Row>
                            </Section>

                            <Row className="mb-4">
                                <Button href={reactivateUrl}>
                                    <Text className="text-md font-semibold">Reactivate subscription</Text>
                                </Button>
                            </Row>

                            {feedbackUrl && (
                                <Row className="mb-6">
                                    <Button href={feedbackUrl} color="secondary">
                                        <Text className="text-md font-semibold">Share feedback</Text>
                                    </Button>
                                </Row>
                            )}

                            <Row>
                                <Text className="text-md text-tertiary">
                                    After {endDate}, your account will be downgraded to our free plan. Your
                                    data will be preserved and you can upgrade again at any time.
                                    <br />
                                    <br />
                                    If you have any questions or need assistance, please contact us at{" "}
                                    <a href={`mailto:${config.supportEmail}`} className="text-brand-secondary">
                                        {config.supportEmail}
                                    </a>
                                    .
                                    <br />
                                    <br />
                                    Thanks for being a customer,
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
