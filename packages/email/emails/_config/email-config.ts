/**
 * Email Brand Configuration
 *
 * This configuration is used across all email templates to maintain
 * consistent branding. Override these values when sending emails
 * by passing a partial config to the template.
 */

export interface EmailBrandConfig {
    /** Company/App name displayed in emails */
    companyName: string;
    /** URL to the logo image (should be hosted on a CDN) */
    logoUrl: string;
    /** Alt text for the logo */
    logoAlt?: string;
    /** Support email address */
    supportEmail: string;
    /** Main website URL */
    websiteUrl: string;
    /** Dashboard/App URL for login links */
    appUrl?: string;
    /** Physical address (for CAN-SPAM compliance) */
    address?: string;
    /** Copyright year */
    copyrightYear?: number;
    /** Social media links */
    socialLinks?: {
        twitter?: string;
        facebook?: string;
        instagram?: string;
        linkedin?: string;
        github?: string;
    };
    /** Legal/compliance links */
    legalLinks?: {
        terms?: string;
        privacy?: string;
        unsubscribe?: string;
        preferences?: string;
    };
    /** Navigation links for email header */
    navLinks?: Array<{
        label: string;
        href: string;
    }>;
}

/**
 * Default email configuration for SmartPockets.
 */
export const defaultEmailConfig: EmailBrandConfig = {
    companyName: "SmartPockets",
    // TODO: Host the SP logo image and update this URL
    logoUrl: "",
    logoAlt: "SmartPockets",
    supportEmail: "support@smartpockets.com",
    websiteUrl: "https://smartpockets.com",
    appUrl: "https://app.smartpockets.com",
    copyrightYear: new Date().getFullYear(),
    socialLinks: {
        twitter: "https://x.com/smartpockets",
    },
    legalLinks: {
        terms: "https://smartpockets.com/terms",
        privacy: "https://smartpockets.com/privacy",
    },
};

/**
 * Merge partial config with defaults
 */
export function getEmailConfig(overrides?: Partial<EmailBrandConfig>): EmailBrandConfig {
    return {
        ...defaultEmailConfig,
        ...overrides,
        socialLinks: {
            ...defaultEmailConfig.socialLinks,
            ...overrides?.socialLinks,
        },
        legalLinks: {
            ...defaultEmailConfig.legalLinks,
            ...overrides?.legalLinks,
        },
    };
}
