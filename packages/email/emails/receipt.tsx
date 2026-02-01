import { Container, Html, Preview, Row, Section } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAligned as Header } from "./_components/header";
import { LineItems, PaymentDetails, type LineItem } from "./_components/line-items";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

/**
 * Props for Receipt email template
 */
export interface ReceiptProps {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName?: string;
    /** Receipt/Invoice number */
    receiptNumber: string;
    /** Transaction date */
    date: string;
    /** Line items */
    items: LineItem[];
    /** Subtotal before tax */
    subtotal: string;
    /** Tax amount */
    tax?: string;
    /** Total amount */
    total: string;
    /** Payment method (e.g., "Visa", "Mastercard") */
    paymentMethod: string;
    /** Last 4 digits of card */
    cardLast4?: string;
    /** URL to view receipt online */
    viewReceiptUrl?: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const Receipt = ({
    theme,
    recipientName,
    receiptNumber,
    date,
    items,
    subtotal,
    tax,
    total,
    paymentMethod,
    cardLast4,
    viewReceiptUrl,
    brandConfig,
}: ReceiptProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Receipt #{receiptNumber} - {total}</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Section align="left" className="max-w-full px-6 py-8">
                            <Row className="mb-6">
                                <Text className="text-tertiary">
                                    {greeting}
                                    <br />
                                    <br />
                                    Thank you for your payment. Here's your receipt for this transaction.
                                </Text>
                            </Row>

                            <PaymentDetails
                                method={paymentMethod}
                                cardLast4={cardLast4}
                                receiptNumber={receiptNumber}
                                date={date}
                            />

                            <LineItems
                                items={items}
                                subtotal={subtotal}
                                tax={tax}
                                total={total}
                            />

                            {viewReceiptUrl && (
                                <Row className="mb-6">
                                    <Button href={viewReceiptUrl}>
                                        <Text className="text-md font-semibold">View receipt online</Text>
                                    </Button>
                                </Row>
                            )}

                            <Row>
                                <Text className="text-md text-tertiary">
                                    If you have any questions about this receipt, please contact us at{" "}
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
