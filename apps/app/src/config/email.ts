/**
 * Email configuration for the application.
 * Uses environment variables for flexibility across environments.
 */
export const emailConfig = {
    from: {
        default: process.env.EMAIL_FROM_DEFAULT || "noreply@example.com",
        support: process.env.EMAIL_FROM_SUPPORT || "support@example.com",
        billing: process.env.EMAIL_FROM_BILLING || "billing@example.com",
    },
    domain: process.env.EMAIL_DOMAIN || "example.com",
    appName: process.env.NEXT_PUBLIC_APP_NAME || "App",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
} as const;

export type EmailFromAddress = keyof typeof emailConfig.from;
