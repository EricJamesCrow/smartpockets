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
 * Default email configuration.
 * Update these values with your actual branding.
 */
export const defaultEmailConfig: EmailBrandConfig = {
    companyName: "Your App",
    logoUrl: "https://yourdomain.com/images/logo.png",
    logoAlt: "Your App Logo",
    supportEmail: "support@yourdomain.com",
    websiteUrl: "https://yourdomain.com",
    appUrl: "https://app.yourdomain.com",
    copyrightYear: new Date().getFullYear(),
    socialLinks: {
        twitter: "https://twitter.com/yourapp",
        // Add other social links as needed
    },
    legalLinks: {
        terms: "https://yourdomain.com/terms",
        privacy: "https://yourdomain.com/privacy",
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
