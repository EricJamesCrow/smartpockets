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
 * Props for PaymentFailed email template
 */
export interface PaymentFailedProps {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName?: string;
    /** Amount that failed to charge */
    amount: string;
    /** Reason for failure (optional) */
    reason?: string;
    /** URL to retry payment */
    retryUrl: string;
    /** URL to update payment method */
    updatePaymentUrl: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const PaymentFailed = ({
    theme,
    recipientName,
    amount,
    reason,
    retryUrl,
    updatePaymentUrl,
    brandConfig,
}: PaymentFailedProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Action required: Payment of {amount} failed</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Section align="left" className="max-w-full px-6 py-8">
                            <Row className="mb-6">
                                <Text className="text-tertiary">
                                    {greeting}
                                    <br />
                                    <br />
                                    We were unable to process your payment of <strong>{amount}</strong>.
                                    {reason && (
                                        <>
                                            {" "}The payment was declined because: {reason}.
                                        </>
                                    )}
                                </Text>
                            </Row>

                            <Section className="my-6 rounded-lg border border-solid border-error-secondary bg-error-primary/10 p-4">
                                <Row>
                                    <Text className="m-0 text-sm text-error-primary">
                                        Please update your payment method to avoid any interruption to your service.
                                    </Text>
                                </Row>
                            </Section>

                            <Row className="mb-4">
                                <Button href={retryUrl}>
                                    <Text className="text-md font-semibold">Retry payment</Text>
                                </Button>
                            </Row>

                            <Row className="mb-6">
                                <Button href={updatePaymentUrl} color="secondary">
                                    <Text className="text-md font-semibold">Update payment method</Text>
                                </Button>
                            </Row>

                            <Row>
                                <Text className="text-md text-tertiary">
                                    If you need help, please contact us at{" "}
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
