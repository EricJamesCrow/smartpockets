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
 * Props for PaymentExpiring email template
 */
export interface PaymentExpiringProps {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName?: string;
    /** Card type (e.g., "Visa", "Mastercard") */
    cardType?: string;
    /** Last 4 digits of card */
    cardLast4: string;
    /** Expiry date (e.g., "12/2024") */
    expiryDate: string;
    /** URL to update payment method */
    updateUrl: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const PaymentExpiring = ({
    theme,
    recipientName,
    cardType = "Card",
    cardLast4,
    expiryDate,
    updateUrl,
    brandConfig,
}: PaymentExpiringProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Your payment method expires soon</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Section align="left" className="max-w-full px-6 py-8">
                            <Row className="mb-6">
                                <Text className="text-tertiary">
                                    {greeting}
                                    <br />
                                    <br />
                                    Your {cardType} ending in <strong>{cardLast4}</strong> expires on <strong>{expiryDate}</strong>.
                                </Text>
                            </Row>

                            <Section className="my-6 rounded-lg border border-solid border-warning-secondary bg-warning-primary/10 p-4">
                                <Row>
                                    <Text className="m-0 text-sm text-warning-primary">
                                        Please update your payment method to avoid any interruption to your service.
                                    </Text>
                                </Row>
                            </Section>

                            <Row className="mb-6">
                                <Button href={updateUrl}>
                                    <Text className="text-md font-semibold">Update payment method</Text>
                                </Button>
                            </Row>

                            <Row>
                                <Text className="text-md text-tertiary">
                                    If you've already updated your payment method, you can ignore this email.
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
