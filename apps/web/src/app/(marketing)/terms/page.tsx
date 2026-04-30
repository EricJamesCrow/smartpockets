import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/marketing/legal-page-layout";

export const metadata: Metadata = {
    title: "Terms and Conditions - SmartPockets",
    description: "Read the terms and conditions governing your use of the SmartPockets application and website.",
};

export default function TermsPage() {
    return (
        <LegalPageLayout
            kicker="III · Terms"
            title="Terms and Conditions"
            subtitle="Effective February 6, 2026"
            description="By accessing or using the SmartPockets application and website, you agree to be bound by these Terms. If you do not agree, do not use the Service."
            italicWord="Terms"
        >
            <p>
                Please read these Terms and Conditions (&ldquo;Terms&rdquo;) carefully before using the SmartPockets application and website (the
                &ldquo;Service&rdquo;) operated by CrowDevelopment LLC (&ldquo;SmartPockets,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
                &ldquo;our&rdquo;). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
            </p>

            <h2>1. Acceptance of Terms</h2>
            <p>
                By creating an account or otherwise accessing the Service, you confirm that you are at least 18 years old and have the legal capacity to enter
                into these Terms. If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to
                these Terms, and &ldquo;you&rdquo; refers to both you individually and that organization.
            </p>

            <h2>2. Description of Service</h2>
            <p>
                SmartPockets is a personal finance management application that helps users organize, track, and optimize their credit card portfolios. The
                Service includes but is not limited to:
            </p>
            <ul>
                <li>Connecting financial institution accounts through Plaid for automated data retrieval.</li>
                <li>Displaying credit card account information, balances, transactions, and liabilities in a unified dashboard.</li>
                <li>Organizing cards into custom wallets and collections.</li>
                <li>Tracking spending patterns, recurring payments, and transaction categories.</li>
                <li>Providing financial summaries, insights, and card optimization suggestions.</li>
            </ul>
            <p>
                SmartPockets is a financial information and organizational tool. It is not a financial advisor, bank, credit institution, or payment processor.
                Any information provided through the Service is for informational purposes only and should not be construed as financial, investment, tax, or
                legal advice.
            </p>

            <h2>3. Account Registration and Security</h2>
            <p>To use the Service, you must create an account through our authentication provider (Clerk). You agree to:</p>
            <ul>
                <li>Provide accurate, current, and complete information during registration.</li>
                <li>Maintain the security of your account credentials and not share them with others.</li>
                <li>Notify us immediately of any unauthorized access to or use of your account.</li>
                <li>Accept responsibility for all activities that occur under your account.</li>
            </ul>
            <p>
                We reserve the right to suspend or terminate your account if we suspect unauthorized use, violation of these Terms, or fraudulent activity.
            </p>

            <h2>4. Financial Data and Plaid Integration</h2>

            <h3>4.1 Plaid Authorization</h3>
            <p>SmartPockets uses Plaid Inc. to access your financial institution data. By connecting a financial institution through SmartPockets, you:</p>
            <ul>
                <li>Authorize Plaid to access your financial account information on your behalf.</li>
                <li>
                    Acknowledge that Plaid&apos;s services are governed by the{" "}
                    <a href="https://plaid.com/legal/#end-user-privacy-policy" target="_blank" rel="noopener noreferrer">
                        Plaid End User Privacy Policy
                    </a>{" "}
                    and Plaid&apos;s End User Services Agreement.
                </li>
                <li>Understand that SmartPockets never receives or stores your bank login credentials.</li>
            </ul>

            <h3>4.2 Data Accuracy</h3>
            <p>
                Financial data displayed in SmartPockets is retrieved from your financial institutions through Plaid. While we strive to display accurate and
                current information:
            </p>
            <ul>
                <li>
                    We do not guarantee the accuracy, completeness, or timeliness of any financial data. Data may be delayed, incomplete, or temporarily
                    unavailable due to factors outside our control.
                </li>
                <li>
                    Transaction data may take 1&ndash;3 business days to appear or update due to processing times at your financial institutions.
                </li>
                <li>
                    You should always verify critical financial information (balances, payment due dates, APRs) directly with your financial institution before
                    making financial decisions.
                </li>
            </ul>

            <h3>4.3 Connection Management</h3>
            <p>
                You may disconnect any financial institution at any time through the Settings &gt; Institutions page. Disconnecting an institution will
                permanently and irreversibly delete all associated data from SmartPockets, including account information, transactions, liabilities, and
                recurring stream data.
            </p>

            <h2>5. Acceptable Use</h2>
            <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
            <ul>
                <li>Use the Service for any illegal or unauthorized purpose.</li>
                <li>Attempt to gain unauthorized access to any part of the Service, other accounts, or computer systems.</li>
                <li>Interfere with or disrupt the integrity or performance of the Service.</li>
                <li>Use automated scripts, bots, or scrapers to access the Service without our written permission.</li>
                <li>Reverse engineer, decompile, or disassemble any part of the Service.</li>
                <li>Reproduce, duplicate, sell, resell, or exploit any portion of the Service without our express written permission.</li>
                <li>Use the Service to transmit any malware, viruses, or other harmful code.</li>
                <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity.</li>
                <li>Use the Service in a manner that could damage, disable, overburden, or impair our servers or networks.</li>
            </ul>

            <h2>6. Intellectual Property</h2>

            <h3>6.1 Our Intellectual Property</h3>
            <p>
                The Service and its original content (excluding user-provided data), features, and functionality are and will remain the exclusive property of
                CrowDevelopment LLC. The Service is protected by copyright, trademark, and other intellectual property laws. Our trademarks and trade dress may
                not be used in connection with any product or service without our prior written consent.
            </p>

            <h3>6.2 Third-Party Trademarks</h3>
            <p>
                All credit card names, bank names, card designs, network logos (Visa, Mastercard, American Express, Discover), and related trademarks are the
                property of their respective owners. SmartPockets is not affiliated with, endorsed by, or sponsored by any financial institution or card
                network. Card images and logos displayed in the Service are used for identification purposes only.
            </p>

            <h3>6.3 Your Content</h3>
            <p>
                You retain ownership of any content you provide to the Service (such as wallet names, notes, and organizational preferences). By providing
                content, you grant us a limited, non-exclusive license to use, store, and display that content solely as necessary to provide the Service to
                you.
            </p>

            <h2>7. Subscription and Fees</h2>
            <p>SmartPockets may offer both free and paid subscription tiers. If you purchase a paid subscription:</p>
            <ul>
                <li>Pricing, features, and billing terms will be clearly presented before purchase.</li>
                <li>Subscriptions may renew automatically unless you cancel before the renewal date.</li>
                <li>
                    Refund policies will be communicated at the time of purchase and may vary by payment platform (e.g., App Store, Google Play, or direct
                    billing).
                </li>
                <li>
                    We reserve the right to modify pricing with reasonable advance notice. Existing subscribers will be notified of price changes before their
                    next billing cycle.
                </li>
            </ul>
            <p>
                Free tier features may be modified, expanded, or reduced at our discretion. We will provide reasonable notice of material changes to free tier
                functionality.
            </p>

            <h2>8. Disclaimer of Warranties</h2>
            <p>
                THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR
                IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p>Without limiting the foregoing, we do not warrant that:</p>
            <ul>
                <li>The Service will be uninterrupted, secure, or error-free.</li>
                <li>Financial data will be accurate, complete, or current at all times.</li>
                <li>Any bank or financial institution connection will function without interruption.</li>
                <li>The Service will meet your specific requirements.</li>
                <li>Defects in the Service will be corrected in any particular timeframe.</li>
            </ul>
            <p>
                SmartPockets does not provide financial, investment, tax, or legal advice. Any card recommendations, spending insights, or optimization
                suggestions are for informational purposes only. You are solely responsible for your own financial decisions. Always consult with a qualified
                financial professional before making significant financial decisions.
            </p>

            <h2>9. Limitation of Liability</h2>
            <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL CROWDEVELOPMENT LLC, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS,
                SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION:
            </p>
            <ul>
                <li>Loss of profits, revenue, data, or goodwill.</li>
                <li>Financial losses resulting from reliance on information displayed in the Service.</li>
                <li>Missed payments, annual fees, expired rewards, or penalties resulting from inaccurate or delayed data.</li>
                <li>Damages resulting from unauthorized access to your account.</li>
                <li>Service interruptions, data loss, or connectivity failures with financial institutions.</li>
            </ul>
            <p>
                IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE AMOUNT YOU PAID TO US, IF ANY, IN THE TWELVE (12) MONTHS PRECEDING THE
                EVENT GIVING RISE TO THE LIABILITY, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
            </p>
            <p>
                Some jurisdictions do not allow the exclusion or limitation of certain damages. In such jurisdictions, our liability shall be limited to the
                greatest extent permitted by law.
            </p>

            <h2>10. Indemnification</h2>
            <p>
                You agree to defend, indemnify, and hold harmless CrowDevelopment LLC and its officers, directors, employees, and agents from and against any
                claims, liabilities, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising out of or in any way connected with:
            </p>
            <ul>
                <li>Your use of the Service.</li>
                <li>Your violation of these Terms.</li>
                <li>Your violation of any third-party rights, including intellectual property rights.</li>
                <li>Any content you provide to the Service.</li>
            </ul>

            <h2>11. Third-Party Services</h2>
            <p>
                The Service integrates with and may contain links to third-party services, including but not limited to Plaid, Clerk, and financial institution
                websites. We do not control and are not responsible for the content, privacy policies, or practices of third-party services. Your use of
                third-party services is governed by their respective terms and policies. We encourage you to review the terms and privacy policies of any
                third-party services you access through SmartPockets.
            </p>

            <h2>12. Termination</h2>
            <p>
                We may terminate or suspend your access to the Service immediately, without prior notice, for any reason, including if you breach these Terms.
                Upon termination:
            </p>
            <ul>
                <li>Your right to use the Service ceases immediately.</li>
                <li>
                    We may delete your account and associated data within 30 days, subject to any legal retention requirements.
                </li>
                <li>
                    Provisions of these Terms that by their nature should survive termination shall survive, including but not limited to: intellectual property
                    provisions, warranty disclaimers, limitation of liability, indemnification, and dispute resolution.
                </li>
            </ul>
            <p>
                You may terminate your account at any time by contacting us or using any account deletion functionality within the Service.
            </p>

            <h2>13. Dispute Resolution</h2>

            <h3>13.1 Governing Law</h3>
            <p>
                These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law
                principles.
            </p>

            <h3>13.2 Informal Resolution</h3>
            <p>
                Before filing any formal legal action, you agree to contact us and attempt to resolve the dispute informally for at least 30 days. Most
                concerns can be resolved quickly through our support channels.
            </p>

            <h3>13.3 Jurisdiction</h3>
            <p>
                If informal resolution is unsuccessful, any legal action or proceeding arising under these Terms shall be brought exclusively in the state or
                federal courts located in Santa Cruz County, California, and you consent to the personal jurisdiction of such courts.
            </p>

            <h2>14. Modifications to Terms</h2>
            <p>
                We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on the Service
                and updating the &ldquo;Effective Date.&rdquo; Your continued use of the Service after any modification constitutes your acceptance of the
                revised Terms. If you do not agree to the modified Terms, you must stop using the Service.
            </p>

            <h2>15. Severability</h2>
            <p>
                If any provision of these Terms is held to be unenforceable or invalid, such provision will be modified to the minimum extent necessary to make
                it enforceable, and the remaining provisions will continue in full force and effect.
            </p>

            <h2>16. Entire Agreement</h2>
            <p>
                These Terms, together with the{" "}
                <a href="/privacy">Privacy Policy</a> and any other legal notices or agreements published by us on the Service, constitute the entire agreement
                between you and CrowDevelopment LLC regarding the Service and supersede all prior agreements and understandings.
            </p>

            <h2>17. Waiver</h2>
            <p>
                Our failure to enforce any right or provision of these Terms will not be considered a waiver of that right or provision. The waiver of any such
                right or provision will be effective only if in writing and signed by a duly authorized representative of CrowDevelopment LLC.
            </p>

            <h2>18. Contact Information</h2>
            <p>If you have questions about these Terms, please contact us:</p>
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
