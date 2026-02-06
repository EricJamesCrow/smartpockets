import { Column, Container, Button as EmailButton, Img, Row, Text as EmailText } from "@react-email/components";
import { Text } from "./text";
import { defaultEmailConfig, type EmailBrandConfig } from "../_config/email-config";

/**
 * Renders the logo as an image if a URL is provided, otherwise falls back to
 * a styled text wordmark: "Smart" in dark + "Pockets" in brand green.
 */
const Logo = ({ logoUrl, logoAlt, className }: { logoUrl: string; logoAlt: string; className?: string }) => {
    if (logoUrl) {
        return <Img aria-hidden src={logoUrl} alt={logoAlt} className={className || "h-7 md:h-8"} />;
    }
    return (
        <EmailText style={{ fontSize: "20px", fontWeight: 700, lineHeight: "28px", margin: 0 }}>
            <span style={{ color: "#181d27" }}>Smart</span>
            <span style={{ color: "#099250" }}>Pockets</span>
        </EmailText>
    );
};

/**
 * Props interface for configurable header components
 */
export interface HeaderProps {
    /** URL to the logo image */
    logoUrl?: string;
    /** Alt text for the logo */
    logoAlt?: string;
    /** URL when clicking the logo */
    homeUrl?: string;
    /** Navigation links to display */
    navLinks?: Array<{ label: string; href: string }>;
    /** Social media links */
    socialLinks?: {
        twitter?: string;
        facebook?: string;
        instagram?: string;
    };
    /** Login button URL */
    loginUrl?: string;
    /** Login button text */
    loginText?: string;
}

const defaultNavLinks = [
    { label: "Home", href: "#" },
    { label: "Blog", href: "#blog" },
    { label: "Tutorial", href: "#tutorial" },
    { label: "Support", href: "#support" },
];

export const LeftAligned = ({
    logoUrl = defaultEmailConfig.logoUrl,
    logoAlt = defaultEmailConfig.logoAlt || "SmartPockets",
}: HeaderProps = {}) => {
    return (
        <Container align="left" className="max-w-full bg-primary p-6">
            <Row>
                <Logo logoUrl={logoUrl} logoAlt={logoAlt} />
            </Row>
        </Container>
    );
};

export const LeftAlignedLinks = ({
    logoUrl = defaultEmailConfig.logoUrl,
    logoAlt = defaultEmailConfig.logoAlt || "SmartPockets",
    homeUrl = defaultEmailConfig.websiteUrl,
    navLinks = defaultNavLinks,
}: HeaderProps = {}) => {
    return (
        <Container align="left" className="max-w-full bg-primary p-6">
            <Row className="mb-8">
                <Logo logoUrl={logoUrl} logoAlt={logoAlt} />
            </Row>
            <Row>
                {navLinks.map((link, index) => (
                    <EmailButton
                        key={link.label}
                        href={index === 0 ? homeUrl : link.href}
                        className={`text-sm font-semibold text-primary md:text-md ${index > 0 ? "ml-4" : ""}`}
                    >
                        {link.label}
                    </EmailButton>
                ))}
            </Row>
        </Container>
    );
};

export const LeftAlignedSocials = ({
    logoUrl = defaultEmailConfig.logoUrl,
    logoAlt = defaultEmailConfig.logoAlt || "SmartPockets",
    loginUrl = defaultEmailConfig.appUrl || defaultEmailConfig.websiteUrl,
    loginText = "Log in",
    socialLinks = defaultEmailConfig.socialLinks,
}: HeaderProps = {}) => {
    return (
        <Container align="center" className="max-w-full min-w-[354px] bg-primary p-6">
            <Row align="left" className="align-middle">
                <div className="flex w-full flex-1 items-center">
                    <Logo logoUrl={logoUrl} logoAlt={logoAlt} className="inline h-7 align-middle md:h-8" />

                    <EmailButton href={loginUrl} className="ml-auto align-middle">
                        <Text className="text-sm font-semibold text-primary md:text-md">{loginText}</Text>
                    </EmailButton>
                    {socialLinks?.twitter && (
                        <EmailButton aria-label="X (formerly Twitter)" href={socialLinks.twitter} className="ml-6 align-middle">
                            <Img aria-hidden src="https://www.untitledui.com/images/email/x-black.webp" alt="X logo" className="size-5" />
                        </EmailButton>
                    )}
                    {socialLinks?.facebook && (
                        <EmailButton aria-label="Facebook" href={socialLinks.facebook} className="mx-4 align-middle">
                            <Img aria-hidden src="https://www.untitledui.com/images/email/facebook-black.webp" alt="Facebook logo" className="size-5" />
                        </EmailButton>
                    )}
                    {socialLinks?.instagram && (
                        <EmailButton aria-label="Instagram" href={socialLinks.instagram} className="align-middle">
                            <Img aria-hidden src="https://www.untitledui.com/images/email/instagram-black.webp" alt="Instagram logo" className="size-5" />
                        </EmailButton>
                    )}
                </div>
            </Row>
        </Container>
    );
};

export const CenterAligned = ({
    logoUrl = defaultEmailConfig.logoUrl,
    logoAlt = defaultEmailConfig.logoAlt || "SmartPockets",
}: HeaderProps = {}) => {
    return (
        <Container align="center" className="max-w-full bg-primary p-6">
            <Row>
                <Column align="center">
                    <Logo logoUrl={logoUrl} logoAlt={logoAlt} />
                </Column>
            </Row>
        </Container>
    );
};

export const CenterAlignedLinks = ({
    logoUrl = defaultEmailConfig.logoUrl,
    logoAlt = defaultEmailConfig.logoAlt || "SmartPockets",
    homeUrl = defaultEmailConfig.websiteUrl,
    navLinks = defaultNavLinks,
}: HeaderProps = {}) => {
    return (
        <Container align="center" className="max-w-full bg-primary p-6">
            <Row>
                <Column align="center">
                    <Logo logoUrl={logoUrl} logoAlt={logoAlt} />
                </Column>
            </Row>
            <Row align="center">
                <Column align="center">
                    {navLinks.map((link, index) => (
                        <EmailButton
                            key={link.label}
                            href={index === 0 ? homeUrl : link.href}
                            className={`text-sm font-semibold text-primary md:text-md ${index < navLinks.length - 1 ? (index < 2 ? "mr-4" : "ml-2") : "ml-4"}`}
                        >
                            {link.label}
                        </EmailButton>
                    ))}
                </Column>
            </Row>
        </Container>
    );
};

export const CenterAlignedSocials = ({
    logoUrl = defaultEmailConfig.logoUrl,
    logoAlt = defaultEmailConfig.logoAlt || "SmartPockets",
    socialLinks = defaultEmailConfig.socialLinks,
}: HeaderProps = {}) => {
    return (
        <Container align="center" className="max-w-full min-w-[354px] bg-primary p-6">
            <Row>
                <Column align="center">
                    <Logo logoUrl={logoUrl} logoAlt={logoAlt} />
                </Column>
            </Row>
            <Row align="center">
                <Column align="center">
                    {socialLinks?.twitter && (
                        <EmailButton aria-label="X (formerly Twitter)" href={socialLinks.twitter}>
                            <Img aria-hidden src="https://www.untitledui.com/images/email/x-black.webp" alt="X logo" className="size-5" />
                        </EmailButton>
                    )}
                    {socialLinks?.facebook && (
                        <EmailButton aria-label="Facebook" href={socialLinks.facebook} className="mx-4">
                            <Img aria-hidden src="https://www.untitledui.com/images/email/facebook-black.webp" alt="Facebook logo" className="size-5" />
                        </EmailButton>
                    )}
                    {socialLinks?.instagram && (
                        <EmailButton aria-label="Instagram" href={socialLinks.instagram}>
                            <Img aria-hidden src="https://www.untitledui.com/images/email/instagram-black.webp" alt="Instagram logo" className="size-5" />
                        </EmailButton>
                    )}
                </Column>
            </Row>
        </Container>
    );
};
