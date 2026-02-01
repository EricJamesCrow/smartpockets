import { Column, Container, Button as EmailButton, Html, Img, Preview, Row } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAlignedSocials as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

/**
 * Props for VideoWelcome02 email template
 */
export interface VideoWelcome02Props {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Video thumbnail URL */
    videoThumbnailUrl?: string;
    /** Video/tutorial URL */
    videoUrl: string;
    /** Contact/support URL */
    contactUrl?: string;
    /** Custom headline */
    headline?: string;
    /** Custom subheadline */
    subheadline?: string;
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

export const VideoWelcome02 = ({
    theme,
    videoThumbnailUrl = "https://www.untitledui.com/images/email/video-welcome-02.webp",
    videoUrl,
    contactUrl,
    headline = "How to get up and running as soon as possible",
    subheadline,
    brandConfig,
}: VideoWelcome02Props) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const defaultSubheadline = `We've created a quick intro video to get you up and running as soon as possible. Don't hesitate to`;

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>{headline}</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-secondary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Container align="left" className="max-w-full bg-primary px-6 py-8">
                            <Row className="mb-6">
                                <Text className="text-center text-display-xs font-semibold text-primary md:text-display-md">
                                    {headline}
                                </Text>
                            </Row>
                            <Row className="mb-8">
                                <Text className="text-center text-sm text-tertiary md:text-md">
                                    {subheadline || defaultSubheadline}{" "}
                                    {contactUrl ? (
                                        <EmailButton className="text-tertiary" href={contactUrl}>
                                            <span className="underline">get in touch</span>
                                        </EmailButton>
                                    ) : (
                                        <EmailButton
                                            className="text-tertiary"
                                            href={`mailto:${config.supportEmail}`}
                                        >
                                            <span className="underline">get in touch</span>
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
                            <Row className="border-collapse">
                                <Column align="center">
                                    <Button href={videoUrl} className="text-center align-middle">
                                        <Img
                                            aria-hidden
                                            src="https://www.untitledui.com/images/email/play-circle-white.webp"
                                            alt="Play circle"
                                            className="inline size-5 align-middle opacity-70"
                                        />
                                        <span className="ml-1.5 align-middle">Watch video</span>
                                    </Button>
                                </Column>
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
