import { Container, Button as EmailButton, Html, Preview, Row, Section } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAligned as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

/**
 * Props for SimpleVerification email template
 */
export interface SimpleVerificationProps {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName: string;
    /** Verification code (e.g., "123456" - will be split into digits) */
    verificationCode: string;
    /** Code expiry time in minutes */
    codeExpiryMinutes?: number;
    /** URL for verification link fallback */
    verifyUrl?: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const SimpleVerification = ({
    theme,
    recipientName = "there",
    verificationCode = "0000",
    codeExpiryMinutes = 5,
    verifyUrl,
    brandConfig,
}: SimpleVerificationProps) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const digits = verificationCode.split("").slice(0, 6);
    const fallbackVerifyUrl = verifyUrl || config.appUrl || config.websiteUrl;
    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Your verification code: {verificationCode}</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Section align="left" className="max-w-full px-6 py-8">
                            <Row className="mb-6">
                                <Text className="text-tertiary">
                                    Hi {recipientName},
                                    <br />
                                    <br />
                                    This is your verification code:
                                </Text>
                            </Row>
                            <Row className="mb-6 min-w-72">
                                {digits.map((digit, index) => (
                                    <EmailButton
                                        key={index}
                                        className={`rounded-[10px] bg-border-brand p-0.5${index > 0 ? " ml-2" : ""}`}
                                    >
                                        <Text className="size-11 rounded-lg bg-primary p-2 text-center align-middle text-display-md font-medium text-brand-tertiary_alt md:size-[62px] md:p-0 md:text-display-lg">
                                            {digit}
                                        </Text>
                                    </EmailButton>
                                ))}
                            </Row>
                            <Row className="mb-6">
                                <Text className="text-md text-tertiary">
                                    This code will only be valid for the next {codeExpiryMinutes} minutes. If the code does not work, you can use this login verification link:
                                </Text>
                            </Row>
                            <Row className="mb-6">
                                <Button href={fallbackVerifyUrl} className="mb-6">
                                    <Text className="text-md font-semibold">Verify email</Text>
                                </Button>
                            </Row>
                            <Row>
                                <Text className="text-md text-tertiary">
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

export default SimpleVerification;
