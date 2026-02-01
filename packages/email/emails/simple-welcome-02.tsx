import { Column, Container, Button as EmailButton, Hr, Html, Img, Preview, Row } from "@react-email/components";
import { Body } from "./_components/body";
import { Button } from "./_components/button";
import { LeftAligned as Footer } from "./_components/footer";
import { Head } from "./_components/head";
import { LeftAligned as Header } from "./_components/header";
import { Tailwind } from "./_components/tailwind";
import { Text } from "./_components/text";
import { defaultEmailConfig, type EmailBrandConfig } from "./_config/email-config";

/**
 * Feature link item for welcome email
 */
export interface FeatureLink {
    /** Link title (displayed with arrow) */
    title: string;
    /** Description text */
    description: string;
    /** URL for the feature link */
    url: string;
}

/**
 * Props for SimpleWelcome02 email template
 */
export interface SimpleWelcome02Props {
    /** Theme variant */
    theme?: "light" | "dark";
    /** Recipient's name */
    recipientName?: string;
    /** Hero image URL */
    heroImageUrl?: string;
    /** URL for get started button */
    loginUrl: string;
    /** Text for get started button */
    loginButtonText?: string;
    /** Feature links to display */
    features?: FeatureLink[];
    /** Brand configuration overrides */
    brandConfig?: Partial<EmailBrandConfig>;
}

const defaultFeatures: FeatureLink[] = [
    {
        title: "View our changelog",
        description: "Weekly new updates and improvements.",
        url: "#changelog",
    },
    {
        title: "Follow us on Twitter",
        description: "Stay up-to-date with the latest announcements.",
        url: "#twitter",
    },
    {
        title: "Read our story",
        description: "Learn about our mission and values.",
        url: "#about",
    },
];

export const SimpleWelcome02 = ({
    theme,
    recipientName,
    heroImageUrl = "https://www.untitledui.com/images/email/simple-welcome-02.webp",
    loginUrl,
    loginButtonText = "Get started",
    features = defaultFeatures,
    brandConfig,
}: SimpleWelcome02Props) => {
    const config = { ...defaultEmailConfig, ...brandConfig };
    const finalLoginUrl = loginUrl || config.appUrl || config.websiteUrl;
    const twitterUrl = config.socialLinks?.twitter || "#";

    return (
        <Html>
            <Tailwind theme={theme}>
                <Head />
                <Preview>Welcome to {config.companyName}!</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header logoUrl={config.logoUrl} logoAlt={config.logoAlt} />
                        <Container align="left" className="max-w-full px-6 py-8">
                            <Row className="mb-12 max-w-full">
                                <Img
                                    aria-hidden
                                    height="auto"
                                    src={heroImageUrl}
                                    alt="Welcome Image"
                                    className="w-full"
                                />
                            </Row>
                            <Row className="mb-6">
                                <Text className="text-display-xs font-semibold text-primary md:text-display-sm">Welcome to {config.companyName}</Text>
                            </Row>
                            <Row>
                                <Text className="text-sm text-tertiary md:text-md">
                                    {recipientName ? `Hi ${recipientName}, we're` : "We're"} excited to welcome you to {config.companyName} and we're even more excited about what we've got planned. You're already on your
                                    way to creating beautiful visual products.
                                    <br />
                                    <br />
                                    Whether you're here for your brand, for a cause, or just for fun—welcome! If there's anything you need, we'll be here every
                                    step of the way.
                                </Text>
                            </Row>
                            {features.map((feature, index) => (
                                <div key={index}>
                                    <Row align="left" className="my-6 mr-auto">
                                        <Column className="w-5" align="left">
                                            <Hr className="m-0 w-20 border-t border-secondary" />
                                        </Column>
                                    </Row>
                                    <Row className="mb-2">
                                        <EmailButton href={feature.url}>
                                            <Text className="text-sm font-semibold text-brand-secondary underline md:text-md">{feature.title} →</Text>
                                        </EmailButton>
                                    </Row>
                                    <Row>
                                        <Text className="text-sm text-tertiary md:text-md">{feature.description}</Text>
                                    </Row>
                                </div>
                            ))}
                            <Row align="left" className="my-6 mr-auto">
                                <Column className="w-5" align="left">
                                    <Hr className="m-0 w-20 border-t border-secondary" />
                                </Column>
                            </Row>
                            <Row className="mb-12">
                                <Text className="text-sm text-tertiary md:text-md">
                                    Thanks for signing up. If you have any questions, send us a message at{" "}
                                    <EmailButton href={`mailto:${config.supportEmail}`} className="text-sm font-semibold text-brand-secondary md:text-md">
                                        {config.supportEmail}
                                    </EmailButton>{" "}
                                    or on{" "}
                                    <EmailButton href={twitterUrl} className="text-sm font-semibold text-brand-secondary md:text-md">
                                        X (Twitter)
                                    </EmailButton>
                                    . We'd love to hear from you.
                                    <br />
                                    <br />— The {config.companyName} team
                                </Text>
                            </Row>
                            <Button href={finalLoginUrl}>
                                <Text className="text-sm font-semibold md:text-md">{loginButtonText}</Text>
                            </Button>
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
