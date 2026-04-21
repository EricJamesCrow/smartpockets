import { defineEnt, defineEntSchema, getEntDefinitions } from "convex-ents";
import { v } from "convex/values";
import { paymentAttemptSchemaValidator } from "./paymentAttemptTypes";

const schema = defineEntSchema(
    {
        // === USERS ===
        users: defineEnt({
            name: v.string(),
            email: v.optional(v.string()),
            connectedAccounts: v.optional(
                v.array(
                    v.object({
                        provider: v.string(),
                        email: v.optional(v.string()),
                        externalId: v.string(),
                    }),
                ),
            ),
        })
            .field("externalId", v.string(), { unique: true }) // Clerk ID
            .edges("members", { ref: true })
            .edges("creditCards", { ref: true })
            .edges("wallets", { ref: true })
            .edges("statementSnapshots", { ref: true })
            .edges("promoRates", { ref: true })
            .edges("installmentPlans", { ref: true })
            .edges("transactionOverlays", { ref: true })
            .edges("transactionAttachments", { ref: true })
            .edges("notificationPreferences", { ref: true }),

        // === ORG LAYER ===
        organizations: defineEnt({
            name: v.string(),
        })
            .field("slug", v.string(), { unique: true })
            .edges("members", { ref: true })
            .edges("roles", { ref: true }),

        members: defineEnt({}).edge("organization").edge("user").edge("role").index("orgUser", ["organizationId", "userId"]),

        roles: defineEnt({
            name: v.string(), // "owner", "admin", "member", "viewer"
            permissions: v.array(v.string()), // ["read", "write", "delete", "manage", "share"]
        })
            .edge("organization")
            .edges("members", { ref: true })
            .index("byOrgAndName", ["organizationId", "name"]),

        // === PAYMENT ATTEMPTS ===
        paymentAttempts: defineEnt(paymentAttemptSchemaValidator)
            .index("byPaymentId", ["payment_id"])
            .index("byUserId", ["userId"])
            .index("byPayerUserId", ["payer.user_id"]),

        // === CREDIT CARDS ===
        creditCards: defineEnt({
            // Plaid identifiers (optional for manual entry)
            plaidItemId: v.optional(v.string()),
            accountId: v.string(), // Unique identifier

            // Account metadata
            accountName: v.string(),
            officialName: v.optional(v.string()),
            mask: v.optional(v.string()), // Last 4 digits
            accountType: v.optional(v.string()),
            accountSubtype: v.optional(v.string()),

            // Balances (stored in milliunits for precision)
            currentBalance: v.optional(v.number()),
            availableCredit: v.optional(v.number()),
            creditLimit: v.optional(v.number()),
            isoCurrencyCode: v.optional(v.string()),

            // APR information
            aprs: v.optional(
                v.array(
                    v.object({
                        aprPercentage: v.number(),
                        aprType: v.string(),
                        balanceSubjectToApr: v.optional(v.number()),
                        interestChargeAmount: v.optional(v.number()),
                    }),
                ),
            ),

            // Payment status
            isOverdue: v.boolean(),
            lastPaymentAmount: v.optional(v.number()),
            lastPaymentDate: v.optional(v.string()),
            lastStatementBalance: v.optional(v.number()),
            lastStatementIssueDate: v.optional(v.string()),
            minimumPaymentAmount: v.optional(v.number()),
            nextPaymentDueDate: v.optional(v.string()),

            // Display fields
            displayName: v.string(),
            company: v.optional(v.string()),
            brand: v.optional(v.union(v.literal("visa"), v.literal("mastercard"), v.literal("amex"), v.literal("discover"), v.literal("other"))),
            lastFour: v.optional(v.string()),

            // Sync tracking
            syncStatus: v.optional(v.union(v.literal("synced"), v.literal("syncing"), v.literal("error"), v.literal("stale"))),
            lastSyncError: v.optional(v.string()),
            syncAttempts: v.optional(v.number()),
            lastSyncedAt: v.optional(v.number()),
            lastSeenAt: v.optional(v.number()),

            // User preferences
            isLocked: v.boolean(),
            lockedAt: v.optional(v.number()),
            isAutoPay: v.boolean(),
            autoPayEnabledAt: v.optional(v.number()),

            // Statement & issuer config
            statementClosingDay: v.optional(v.number()),
            payOverTimeEnabled: v.optional(v.boolean()),
            payOverTimeLimit: v.optional(v.number()),
            payOverTimeApr: v.optional(v.number()),

            // User overrides (preserves raw Plaid data, user edits stored here)
            userOverrides: v.optional(
                v.object({
                    officialName: v.optional(v.string()),
                    accountName: v.optional(v.string()),
                    company: v.optional(v.string()),
                    aprs: v.optional(
                        v.array(
                            v.object({
                                index: v.number(),
                                aprPercentage: v.optional(v.number()),
                                balanceSubjectToApr: v.optional(v.number()),
                                interestChargeAmount: v.optional(v.number()),
                            }),
                        ),
                    ),
                    providerDashboardUrl: v.optional(v.string()),
                }),
            ),

            // State
            isActive: v.boolean(),
        })
            .edge("user")
            .edges("walletCards", { ref: true })
            .edges("statementSnapshots", { ref: true })
            .edges("promoRates", { ref: true })
            .edges("installmentPlans", { ref: true })
            .index("by_accountId", ["accountId"])
            .index("by_plaidItemId", ["plaidItemId"])
            .index("by_user_active", ["userId", "isActive"])
            .index("by_user_overdue", ["userId", "isOverdue"])
            .index("by_closingDay_active", ["statementClosingDay", "isActive"]),

        // === CREDIT CARD DETAILS ===
        statementSnapshots: defineEnt({
            statementDate: v.string(),
            previousBalance: v.number(),
            paymentsAndCredits: v.number(),
            newPurchases: v.number(),
            fees: v.number(),
            interestCharged: v.number(),
            newBalance: v.number(),
            minimumPaymentDue: v.number(),
            dueDate: v.string(),
            source: v.union(v.literal("manual"), v.literal("inferred")),
        })
            .edge("user")
            .edge("creditCard")
            .index("by_card_date", ["creditCardId", "statementDate"]),

        promoRates: defineEnt({
            description: v.string(),
            aprPercentage: v.number(),
            originalBalance: v.number(),
            remainingBalance: v.number(),
            startDate: v.string(),
            expirationDate: v.string(),
            isDeferredInterest: v.boolean(),
            accruedDeferredInterest: v.optional(v.number()),
            monthlyMinimumPayment: v.optional(v.number()),
            isActive: v.boolean(),
            // User overrides for Plaid-synced promos
            userOverrides: v.optional(
                v.object({
                    expirationDate: v.optional(v.string()),
                }),
            ),
            // True for user-created promos (not from Plaid)
            isManual: v.optional(v.boolean()),
        })
            .edge("user")
            .edge("creditCard"),

        installmentPlans: defineEnt({
            description: v.string(),
            startDate: v.string(),
            originalPrincipal: v.number(),
            remainingPrincipal: v.number(),
            totalPayments: v.number(),
            remainingPayments: v.number(),
            monthlyPrincipal: v.number(),
            monthlyFee: v.number(),
            aprPercentage: v.number(),
            isActive: v.boolean(),
        })
            .edge("user")
            .edge("creditCard"),

        // === WALLETS ===
        wallets: defineEnt({
            name: v.string(),
            color: v.optional(v.string()),
            icon: v.optional(v.string()),
            isPinned: v.boolean(),
            sortOrder: v.number(),
            pinnedSortOrder: v.number(),
        })
            .edge("user")
            .edges("walletCards", { ref: true })
            .index("by_user_sortOrder", ["userId", "sortOrder"])
            .index("by_user_pinned", ["userId", "isPinned"]),

        walletCards: defineEnt({
            sortOrder: v.number(),
            addedAt: v.number(),
        })
            .edge("wallet")
            .edge("creditCard")
            .index("by_wallet_sortOrder", ["walletId", "sortOrder"]),

        // === USER PREFERENCES ===
        userPreferences: defineEnt({
            userId: v.id("users"),
            appearance: v.optional(
                v.object({
                    theme: v.optional(v.union(v.literal("system"), v.literal("light"), v.literal("dark"))),
                    brandColor: v.optional(v.string()),
                    transparentSidebar: v.optional(v.boolean()),
                    language: v.optional(v.string()),
                    bannerAppearance: v.optional(v.union(v.literal("default"), v.literal("simplified"), v.literal("custom"))),
                }),
            ),
        }).index("byUserId", ["userId"]),

        // === TRANSACTION OVERLAYS ===
        transactionOverlays: defineEnt({
            plaidTransactionId: v.string(),
            isReviewed: v.optional(v.boolean()),
            reviewedAt: v.optional(v.number()),
            isHidden: v.optional(v.boolean()),
            notes: v.optional(v.string()),
            userCategory: v.optional(v.string()),
            userDate: v.optional(v.string()),
            userMerchantName: v.optional(v.string()),
            userTime: v.optional(v.string()),
        })
            .edge("user")
            .index("by_plaidTransactionId", ["plaidTransactionId"])
            .index("by_user_and_transaction", ["userId", "plaidTransactionId"]),

        // === TRANSACTION ATTACHMENTS ===
        transactionAttachments: defineEnt({
            plaidTransactionId: v.string(),
            storageId: v.id("_storage"),
            fileName: v.string(),
            mimeType: v.string(),
            fileSize: v.number(),
        })
            .edge("user")
            .index("by_transaction", ["plaidTransactionId"])
            .index("by_user_and_transaction", ["userId", "plaidTransactionId"]),

        // === NOTIFICATION PREFERENCES (W7) ===
        notificationPreferences: defineEnt({
            weeklyDigestEnabled: v.boolean(),
            promoWarningEnabled: v.boolean(),
            statementReminderEnabled: v.boolean(),
            anomalyAlertEnabled: v.boolean(),
            subscriptionDetectedEnabled: v.boolean(),
            welcomeOnboardingEnabled: v.boolean(),
            masterUnsubscribed: v.boolean(),
            updatedAt: v.number(),
        }).edge("user"),

        // === EMAIL EVENTS (W7) ===
        // Unified log for sends, dev captures, and inbound Resend webhooks.
        // `idempotencyKey` is a unique Ents field enforcing Strategy C-prime
        // dedup at DB insert time. Webhook-event rows use synthetic keys of
        // the form `webhook:<resendEmailId>:<source>` so they never collide
        // with application sends.
        //
        // userId is a plain optional field (not an Ents edge) because
        // Convex Ents does not support `optional: true` on edges and
        // webhook rows intentionally arrive before we know the user
        // (we resolve via resendEmailId sibling lookup when needed).
        emailEvents: defineEnt({
            userId: v.optional(v.id("users")),
            email: v.string(),
            templateKey: v.string(),
            cadence: v.optional(v.number()),
            source: v.union(
                v.literal("send"),
                v.literal("dev-capture"),
                v.literal("webhook-sent"),
                v.literal("webhook-delivered"),
                v.literal("webhook-bounced"),
                v.literal("webhook-complained"),
                v.literal("webhook-opened"),
                v.literal("webhook-clicked"),
                v.literal("webhook-delayed"),
                v.literal("webhook-failed"),
            ),
            resendEmailId: v.optional(v.string()),
            workflowId: v.optional(v.string()),
            payloadJson: v.any(),
            errorMessage: v.optional(v.string()),
            status: v.union(
                v.literal("pending"),
                v.literal("running"),
                v.literal("sent"),
                v.literal("skipped_pref"),
                v.literal("skipped_dedup"),
                v.literal("skipped_suppression"),
                v.literal("failed"),
            ),
            attemptCount: v.number(),
            createdAt: v.number(),
            processedAt: v.optional(v.number()),
        })
            .field("idempotencyKey", v.string(), { unique: true })
            .index("by_user_created", ["userId", "createdAt"])
            .index("by_resendEmailId", ["resendEmailId"])
            .index("by_template_created", ["templateKey", "createdAt"])
            .index("by_status_created", ["status", "createdAt"])
            .index("by_workflowId", ["workflowId"])
            .index("by_user_template_status", ["userId", "templateKey", "status"]),

        // === EMAIL SUPPRESSIONS (W7) ===
        // Keyed by email so Clerk email-change events do not reset
        // suppression. userId is an optional plain field; webhook
        // handlers may resolve it later via resendEmailId sibling lookup.
        emailSuppressions: defineEnt({
            userId: v.optional(v.id("users")),
            reason: v.union(v.literal("hard_bounce"), v.literal("complaint")),
            firstEventAt: v.number(),
            lastEventAt: v.number(),
            eventCount: v.number(),
        })
            .field("email", v.string(), { unique: true })
            .index("by_user", ["userId"]),
    },
    { schemaValidation: false },
);

export default schema;
export const entDefinitions = getEntDefinitions(schema);
