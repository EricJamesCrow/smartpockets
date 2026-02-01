import { Container, Button as EmailButton, Html, Img, Preview, Row } from "@react-email/components";
import { Body } from "./_components/body";
import { CenterAlignedActions as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { CenterAligned as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

/**
 * Props for VideoWelcome01 email template
 */
export interface VideoWelcome01Props {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName?: string;
    /** Video thumbnail URL */
    videoThumbnailUrl?: string;
    /** Video/tutorial URL */
    videoUrl: string;
    /** Contact/support URL */
    contactUrl?: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const VideoWelcome01 = ({
    theme,
    recipientName,
    videoThumbnailUrl = "https://www.untitledui.com/images/email/video-welcome-01.webp",
    videoUrl,
    contactUrl,
    brandConfig,
}: VideoWelcome01Props) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Welcome to {config.companyName}!</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-secondary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Container align="left" className="max-w-full bg-primary px-6 py-8">
                            <Row className="mb-8">
                                <Text className="text-sm text-tertiary md:text-md">
                                    {greeting}
                                    <br />
                                    <br />
                                    Welcome to {config.companyName}! You're already on your way to creating
                                    beautiful visual products.
                                    <br />
                                    <br />
                                    We've created a quick intro video to get you up and running as soon as
                                    possible. If you have any questions,{" "}
                                    {contactUrl ? (
                                        <EmailButton className="text-tertiary" href={contactUrl}>
                                            <span className="underline">please get in touch</span>
                                        </EmailButton>
                                    ) : (
                                        <EmailButton
                                            className="text-tertiary"
                                            href={`mailto:${config.supportEmail}`}
                                        >
                                            <span className="underline">please get in touch</span>
                                        </EmailButton>
                                    )}
                                    .
                                </Text>
                            </Row>
                            <Row className="mb-8 max-w-full">
                                <EmailButton aria-label="Video tutorial on getting started" href={videoUrl}>
                                    <Img
                                        aria-hidden
                                        src={videoThumbnailUrl}
                                        alt="Video player"
                                        className="w-full"
                                    />
                                </EmailButton>
                            </Row>
                            <Row>
                                <Text className="text-md text-tertiary">
                                    Thanks,
                                    <br />
                                    The {config.companyName} team
                                </Text>
                            </Row>
                        </Container>
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
