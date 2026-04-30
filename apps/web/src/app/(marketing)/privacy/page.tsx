import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/marketing/legal-page-layout";

export const metadata: Metadata = {
    title: "Privacy Policy - SmartPockets",
    description: "Learn how SmartPockets collects, uses, and protects your personal and financial information.",
};

export default function PrivacyPage() {
    return (
        <LegalPageLayout
            kicker="II · Privacy"
            title="Privacy Policy"
            subtitle="Effective February 6, 2026"
            description="Your privacy is important to us at SmartPockets. We respect your privacy regarding any information we may collect from you across our service."
            italicWord="Privacy"
        >
            <p>
                CrowDevelopment LLC (&ldquo;SmartPockets,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the SmartPockets
                application and website (collectively, the &ldquo;Service&rdquo;). This Privacy Policy explains how we collect, use, disclose, and safeguard
                your information when you use our Service. Please read this policy carefully. If you do not agree with the terms of this Privacy Policy, please
                do not access the Service.
            </p>

            <h2>1. Information We Collect</h2>

            <h3>1.1 Information You Provide Directly</h3>
            <p>When you create an account or use SmartPockets, you may provide us with:</p>
            <ul>
                <li>Account registration information such as your name, email address, and password (managed through our authentication provider, Clerk).</li>
                <li>Profile information including display preferences, theme settings, and notification preferences.</li>
                <li>User-generated content such as custom wallet names, card nicknames, notes, and organizational preferences.</li>
                <li>Communications you send to us, including support requests and feedback.</li>
            </ul>

            <h3>1.2 Financial Data Collected Through Plaid</h3>
            <p>
                SmartPockets uses Plaid Inc. (&ldquo;Plaid&rdquo;) to connect your financial accounts. When you link a financial institution, Plaid collects
                and transmits the following data to SmartPockets on your behalf:
            </p>
            <ul>
                <li>Account information: account names, types, balances, official names, and masked account numbers (last 4 digits only).</li>
                <li>Transaction data: merchant names, transaction amounts, dates, categories, and pending/posted status.</li>
                <li>Liability information: credit card APRs, minimum payments, due dates, credit limits, and balance details.</li>
                <li>Recurring transaction streams: subscription and recurring payment patterns detected by Plaid.</li>
                <li>Institution metadata: bank or credit union names, logos, and connection status.</li>
            </ul>
            <blockquote>
                <p>
                    <strong>Important:</strong> SmartPockets never receives, stores, or has access to your bank login credentials (username or password). These
                    are handled entirely by Plaid. We also never receive full account numbers, routing numbers, or Social Security numbers through the Plaid
                    integration.
                </p>
            </blockquote>

            <h3>1.3 Automatically Collected Information</h3>
            <p>When you use SmartPockets, we may automatically collect:</p>
            <ul>
                <li>Device and browser information (device type, operating system, browser type).</li>
                <li>Usage data such as pages visited, features used, and interaction patterns.</li>
                <li>IP address and approximate geographic location.</li>
                <li>Cookies and similar tracking technologies as described in Section 6.</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
                <li>
                    Provide, operate, and maintain the SmartPockets Service, including credit card portfolio management, transaction tracking, and financial
                    organization features.
                </li>
                <li>
                    Process and display your financial data in a unified dashboard, including balances, transactions, liabilities, and recurring payments.
                </li>
                <li>Synchronize your financial data through scheduled syncs and webhook-driven real-time updates.</li>
                <li>Generate insights such as spending summaries, category breakdowns, and card optimization recommendations.</li>
                <li>
                    Send you notifications related to your account, including payment reminders, annual fee alerts, and security notices.
                </li>
                <li>Improve and develop new features based on aggregated, anonymized usage patterns.</li>
                <li>Respond to your support inquiries and communications.</li>
                <li>Detect, prevent, and address fraud, unauthorized access, and other security issues.</li>
                <li>Comply with applicable legal obligations.</li>
            </ul>

            <h2>3. How We Store and Protect Your Information</h2>

            <h3>3.1 Data Storage</h3>
            <p>
                Your data is stored using Convex, our real-time database provider. Financial data is organized across structured tables including account
                information, transactions, liabilities, recurring streams, and denormalized credit card summaries. All monetary values are stored as integer
                milliunits (multiplied by 1,000) to ensure precision.
            </p>

            <h3>3.2 Security Measures</h3>
            <p>We implement a variety of security measures to maintain the safety of your personal information:</p>
            <ul>
                <li>Plaid access tokens are encrypted using field-level encryption before storage.</li>
                <li>Authentication is managed through Clerk with industry-standard practices including secure session management.</li>
                <li>All data transmissions between your device and our servers use TLS encryption.</li>
                <li>We implement rate limiting and circuit breakers to protect against unauthorized access attempts.</li>
                <li>Webhook payloads from Plaid are verified using cryptographic signatures (JWS verification).</li>
                <li>All database queries enforce authentication checks and resource ownership verification.</li>
            </ul>
            <p>
                While we strive to use commercially acceptable means to protect your personal information, no method of transmission over the Internet or method
                of electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>

            <h2>4. How We Share Your Information</h2>
            <p>We do not sell, rent, or trade your personal information. We may share your information only in the following circumstances:</p>

            <h3>Service Providers</h3>
            <p>We share data with third-party service providers who perform services on our behalf:</p>
            <ul>
                <li>
                    <strong>Plaid Inc.</strong> &mdash; Financial data aggregation and bank connectivity. Plaid&apos;s use of your data is governed by the{" "}
                    <a href="https://plaid.com/legal/#end-user-privacy-policy" target="_blank" rel="noopener noreferrer">
                        Plaid End User Privacy Policy
                    </a>
                    .
                </li>
                <li>
                    <strong>Clerk</strong> &mdash; Authentication and user identity management.
                </li>
                <li>
                    <strong>Convex</strong> &mdash; Real-time database hosting and serverless function execution.
                </li>
                <li>
                    <strong>Vercel</strong> &mdash; Application hosting and content delivery.
                </li>
            </ul>

            <h3>Legal Requirements</h3>
            <p>
                We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court order or
                government agency).
            </p>

            <h3>Business Transfers</h3>
            <p>
                If CrowDevelopment LLC is involved in a merger, acquisition, or asset sale, your personal information may be transferred. We will provide notice
                before your personal information becomes subject to a different privacy policy.
            </p>

            <h3>With Your Consent</h3>
            <p>We may share your information with third parties when you have given us explicit consent to do so.</p>

            <h2>5. Plaid Integration and Data Access</h2>
            <p>SmartPockets uses Plaid to provide secure connectivity to your financial institutions. Key details about this integration:</p>
            <ul>
                <li>You authorize the connection to each financial institution through Plaid&apos;s secure Link interface.</li>
                <li>
                    You can disconnect any financial institution at any time through the Settings &gt; Institutions page. Disconnecting an institution
                    permanently removes all associated data (accounts, transactions, liabilities, and recurring streams) from SmartPockets.
                </li>
                <li>
                    You can pause (deactivate) a bank connection without disconnecting it. Paused connections retain your data but exclude it from display and
                    scheduled syncs until reactivated.
                </li>
                <li>
                    SmartPockets performs scheduled data synchronization daily at 2:00 AM UTC for active connections. Additional syncs occur in response to
                    webhooks from Plaid when your financial data changes.
                </li>
                <li>
                    Plaid&apos;s own privacy practices are governed by the{" "}
                    <a href="https://plaid.com/legal/#end-user-privacy-policy" target="_blank" rel="noopener noreferrer">
                        Plaid End User Privacy Policy
                    </a>
                    . We encourage you to review Plaid&apos;s policy independently.
                </li>
            </ul>

            <h2>6. Cookies and Tracking Technologies</h2>
            <p>SmartPockets uses cookies and similar technologies for:</p>
            <ul>
                <li>
                    <strong>Essential cookies:</strong> Authentication session management and security.
                </li>
                <li>
                    <strong>Preference cookies:</strong> Storing your theme selection, display preferences, and UI settings (e.g., sidebar state).
                </li>
                <li>
                    <strong>Analytics cookies:</strong> Understanding how you use the Service to improve features and performance.
                </li>
            </ul>
            <p>
                You can control cookies through your browser settings. Disabling essential cookies may prevent you from using certain features of the Service.
            </p>

            <h2>7. Data Retention</h2>
            <p>We retain your personal information for as long as your account is active or as needed to provide you with the Service. Specifically:</p>
            <ul>
                <li>Account and profile data is retained until you delete your account.</li>
                <li>
                    Financial data (transactions, liabilities, account information) is retained while the associated bank connection is active. When you
                    disconnect an institution, all associated data is permanently deleted via cascade deletion.
                </li>
                <li>Aggregated, anonymized data that cannot be used to identify you may be retained indefinitely for analytical purposes.</li>
            </ul>
            <p>
                Upon account deletion, we will delete or anonymize your personal information within 30 days, except where retention is required by law.
            </p>

            <h2>8. Your Rights and Choices</h2>
            <p>Depending on your jurisdiction, you may have the following rights regarding your personal information:</p>
            <ul>
                <li>
                    <strong>Access:</strong> Request a copy of the personal information we hold about you.
                </li>
                <li>
                    <strong>Correction:</strong> Request correction of inaccurate or incomplete personal information.
                </li>
                <li>
                    <strong>Deletion:</strong> Request deletion of your personal information, subject to certain legal exceptions.
                </li>
                <li>
                    <strong>Data Portability:</strong> Request your data in a structured, commonly used, machine-readable format.
                </li>
                <li>
                    <strong>Opt-Out:</strong> Opt out of non-essential communications and marketing emails.
                </li>
                <li>
                    <strong>Withdraw Consent:</strong> Where processing is based on consent, withdraw consent at any time without affecting the lawfulness of
                    prior processing.
                </li>
            </ul>
            <p>To exercise any of these rights, please contact us at the address provided in Section 12.</p>

            <h2>9. California Privacy Rights (CCPA)</h2>
            <p>
                If you are a California resident, the California Consumer Privacy Act (CCPA) provides you with additional rights regarding your personal
                information, including the right to know what personal information is collected, used, and shared, the right to delete personal information, and
                the right to opt out of the sale of personal information. SmartPockets does not sell personal information. To exercise your California privacy
                rights, contact us at the address in Section 12.
            </p>

            <h2>10. Children&apos;s Privacy</h2>
            <p>
                SmartPockets is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from children. If we become
                aware that we have collected personal information from a child without verification of parental consent, we will take steps to delete that
                information promptly.
            </p>

            <h2>11. Changes to This Privacy Policy</h2>
            <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page
                and updating the &ldquo;Effective Date&rdquo; at the top. We encourage you to review this Privacy Policy periodically. Your continued use of the
                Service after any changes constitutes your acceptance of the updated policy.
            </p>

            <h2>12. Contact Us</h2>
            <p>If you have questions or concerns about this Privacy Policy or our data practices, please contact us:</p>
            <p>
                CrowDevelopment LLC
                <br />
                Santa Cruz, CA
                <br />
                Email:{" "}
                <a href="mailto:EricCrow@pm.me">EricCrow@pm.me</a>
            </p>
            <p>&copy; 2026 CrowDevelopment LLC. All rights reserved.</p>
        </LegalPageLayout>
    );
}
